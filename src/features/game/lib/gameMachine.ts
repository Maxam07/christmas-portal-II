import { createMachine, Interpreter, assign, TransitionsConfig } from "xstate";
import { EVENTS, GameEvent } from "../events";
import { processEvent } from "./processEvent";

import { Context as AuthContext } from "features/auth/lib/authMachine";
import { metamask } from "../../../lib/blockchain/metamask";

import { GameState } from "../types/game";
import { loadSession } from "../actions/loadSession";
import { INITIAL_FARM, EMPTY } from "./constants";
import { autosave, solveCaptcha } from "../actions/autosave";
import { mint } from "../actions/mint";
import { LimitedItem } from "../types/craftables";
import { sync } from "../actions/sync";
import { withdraw } from "../actions/withdraw";
import { getVisitState } from "../actions/visit";
import { ERRORS } from "lib/errors";
import { updateGame } from "./transforms";
import { getFingerPrint } from "./botDetection";

export type PastAction = GameEvent & {
  createdAt: Date;
};

export interface Context {
  state: GameState;
  actions: PastAction[];
  offset: number;
  sessionId?: string;
  captcha?: string;
  errorCode?: keyof typeof ERRORS;
  fingerprint?: string;
}

type MintEvent = {
  type: "MINT";
  item: LimitedItem;
};

type WithdrawEvent = {
  type: "WITHDRAW";
  sfl: number;
  ids: number[];
  amounts: string[];
};

export type BlockchainEvent =
  | {
      type: "SAVE";
    }
  | {
      type: "SYNC";
    }
  | {
      type: "REFRESH";
    }
  | WithdrawEvent
  | GameEvent
  | MintEvent;

// For each game event, convert it to an XState event + handler
const GAME_EVENT_HANDLERS: TransitionsConfig<Context, BlockchainEvent> =
  Object.keys(EVENTS).reduce(
    (events, eventName) => ({
      ...events,
      [eventName]: {
        actions: assign((context: Context, event: GameEvent) => ({
          state: processEvent(context.state as GameState, event) as GameState,
          actions: [
            ...context.actions,
            {
              ...event,
              createdAt: new Date(),
            },
          ],
        })),
      },
    }),
    {}
  );

export type BlockchainState = {
  value:
    | "loading"
    | "playing"
    | "readonly"
    | "autosaving"
    | "captcha"
    | "minting"
    | "success"
    | "syncing"
    | "withdrawing"
    | "error"
    | "blacklisted";
  context: Context;
};

export type StateKeys = keyof Omit<BlockchainState, "context">;
export type StateValues = BlockchainState[StateKeys];

export type MachineInterpreter = Interpreter<
  Context,
  any,
  BlockchainEvent,
  BlockchainState
>;

type Options = AuthContext & { isNoob: boolean };

export function startGame(authContext: Options) {
  const handleInitialState = () => {
    if (authContext.sessionId || !authContext.address) {
      return "playing";
    }
    return "readonly";
  };

  return createMachine<Context, BlockchainEvent, BlockchainState>(
    {
      id: "gameMachine",
      initial: "loading",
      context: {
        actions: [],
        state: EMPTY,
        sessionId: authContext.sessionId,
        offset: 0,
      },
      states: {
        loading: {
          invoke: {
            src: async (context) => {
              // Load the farm session
              if (context.sessionId) {
                const response = await loadSession({
                  farmId: Number(authContext.farmId),
                  sessionId: context.sessionId as string,
                  token: authContext.rawToken as string,
                });

                if (!response) {
                  throw new Error("NO_FARM");
                }

                const { game, offset, isBlacklisted } = response;

                // add farm address
                game.farmAddress = authContext.address;

                const fingerprint = await getFingerPrint();

                return {
                  state: game,
                  offset,
                  isBlacklisted,
                  fingerprint,
                };
              }

              // Visit farm
              if (authContext.address) {
                const game = await getVisitState(authContext.address as string);

                game.id = authContext.farmId as number;

                return { state: game };
              }

              return { state: INITIAL_FARM };
            },
            onDone: [
              {
                target: "blacklisted",
                cond: (_, event) => event.data.isBlacklisted,
              },
              {
                target: handleInitialState(),
                actions: assign({
                  state: (_, event) => event.data.state,
                  offset: (_, event) => event.data.offset,
                  fingerprint: (_, event) => event.data.fingerprint,
                }),
              },
            ],
            onError: {
              target: "error",
            },
          },
        },
        playing: {
          on: {
            ...GAME_EVENT_HANDLERS,
            SAVE: {
              target: "autosaving",
            },
            MINT: {
              target: "minting",
            },
            SYNC: {
              target: "syncing",
            },
            WITHDRAW: {
              target: "withdrawing",
            },
          },
        },
        autosaving: {
          on: {
            ...GAME_EVENT_HANDLERS,
          },
          invoke: {
            src: async (context, event) => {
              const saveAt = (event as any)?.data?.saveAt || new Date();

              if (context.actions.length === 0) {
                return { verified: true, saveAt };
              }

              const { verified, farm } = await autosave({
                farmId: Number(authContext.farmId),
                sessionId: context.sessionId as string,
                actions: context.actions,
                token: authContext.rawToken as string,
                offset: context.offset,
                captcha: context.captcha,
                fingerprint: context.fingerprint as string,
              });

              // This gives the UI time to indicate that a save is taking place both when clicking save
              // and when autosaving
              await new Promise((res) => setTimeout(res, 1000));

              return {
                saveAt,
                verified,
                farm,
              };
            },
            onDone: [
              {
                target: "captcha",
                cond: (_, event) => {
                  return !event.data.verified;
                },
              },
              {
                target: "playing",
                // Remove the events that were submitted
                actions: assign((context: Context, event) => ({
                  actions: context.actions.filter(
                    (action) =>
                      action.createdAt.getTime() > event.data.saveAt.getTime()
                  ),
                  state: updateGame(event.data.farm, context.state),
                })),
              },
            ],
            onError: {
              target: "error",
              actions: "assignErrorMessage",
            },
          },
        },
        captcha: {
          invoke: {
            src: async (_, event: any) => {
              const captcha = await solveCaptcha();

              return {
                captcha,
                ...event.data,
              };
            },
            onDone: {
              target: "autosaving",
              actions: assign((context: Context, event) => ({
                captcha: event.data.captcha,
              })),
            },
            onError: {
              target: "error",
              actions: "assignErrorMessage",
            },
          },
        },
        minting: {
          invoke: {
            src: async (context, event) => {
              // Autosave just in case
              if (context.actions.length > 0) {
                await autosave({
                  farmId: Number(authContext.farmId),
                  sessionId: context.sessionId as string,
                  actions: context.actions,
                  token: authContext.rawToken as string,
                  offset: context.offset,
                  fingerprint: context.fingerprint as string,
                });
              }

              const session = await mint({
                farmId: Number(authContext.farmId),
                sessionId: context.sessionId as string,
                token: authContext.rawToken as string,
                item: (event as MintEvent).item,
              });

              return {
                sessionId: session?.sessionId,
              };
            },
            onDone: {
              target: "success",
              actions: assign({
                sessionId: (_, event) => event.data.sessionId,
              }),
            },
            onError: {
              target: "error",
              actions: "assignErrorMessage",
            },
          },
        },
        syncing: {
          invoke: {
            src: async (context) => {
              // Autosave just in case
              if (context.actions.length > 0) {
                await autosave({
                  farmId: Number(authContext.farmId),
                  sessionId: context.sessionId as string,
                  actions: context.actions,
                  token: authContext.rawToken as string,
                  offset: context.offset,
                  fingerprint: context.fingerprint as string,
                });
              }

              const session = await sync({
                farmId: Number(authContext.farmId),
                sessionId: context.sessionId as string,
                token: authContext.rawToken as string,
              });

              return {
                sessionId: session?.sessionId,
              };
            },
            onDone: {
              target: "success",
              actions: assign({
                sessionId: (_, event) => event.data.sessionId,
              }),
            },
            onError: [
              {
                target: "playing",
                cond: (_, event: any) =>
                  event.data.message === ERRORS.REJECTED_TRANSACTION,
              },
              {
                target: "error",
                actions: "assignErrorMessage",
              },
            ],
          },
        },
        withdrawing: {
          invoke: {
            src: async (context, event) => {
              const { amounts, ids, sfl } = event as WithdrawEvent;
              const session = await withdraw({
                farmId: Number(authContext.farmId),
                sessionId: context.sessionId as string,
                token: authContext.rawToken as string,
                amounts,
                ids,
                sfl,
              });

              return {
                sessionId: session?.sessionId,
              };
            },
            onDone: {
              target: "success",
              actions: assign({
                sessionId: (_, event) => event.data.sessionId,
              }),
            },
            onError: [
              {
                target: "playing",
                cond: (_, event: any) =>
                  event.data.message === ERRORS.REJECTED_TRANSACTION,
              },
              {
                target: "error",
                actions: "assignErrorMessage",
              },
            ],
          },
        },
        readonly: {},
        error: {},
        blacklisted: {},
        success: {
          on: {
            REFRESH: {
              target: "loading",
            },
          },
        },
      },
    },
    {
      actions: {
        assignErrorMessage: assign<Context, any>({
          errorCode: (_context, event) => event.data.message,
        }),
      },
    }
  );
}
