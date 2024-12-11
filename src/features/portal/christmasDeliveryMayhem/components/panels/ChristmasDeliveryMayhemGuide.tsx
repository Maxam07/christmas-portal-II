import React from "react";

import { useAppTranslation } from "lib/i18n/useAppTranslations";
import { SUNNYSIDE } from "assets/sunnyside";
import { SquareIcon } from "components/ui/SquareIcon";
import { ITEM_DETAILS } from "features/game/types/images";
import { Label } from "components/ui/Label";
import {
  RESOURCES_TABLE,
  ELVES_TABLE,
  EVENTS_TABLE,
} from "../../ChristmasDeliveryMayhemConstants";
import { PIXEL_SCALE } from "features/game/lib/constants";
import { useSound } from "lib/utils/hooks/useSound";

type Props = {
  onBack: () => void;
};

export const ChristmasDeliveryMayhemGuide: React.FC<Props> = ({ onBack }) => {
  const { t } = useAppTranslation();

  const button = useSound("button");

  return (
    <div className="flex flex-col gap-1 max-h-[75vh]">
      {/* title */}
      <div className="flex flex-col gap-1">
        <div className="flex text-center">
          <div
            className="flex-none"
            style={{
              width: `${PIXEL_SCALE * 11}px`,
              marginLeft: `${PIXEL_SCALE * 2}px`,
            }}
          >
            <img
              src={SUNNYSIDE.icons.arrow_left}
              className="cursor-pointer"
              onClick={() => {
                button.play();
                onBack();
              }}
              style={{
                width: `${PIXEL_SCALE * 11}px`,
              }}
            />
          </div>
          <div className="grow mb-3 text-lg">
            {t("christmas-delivery-mayhem.guide")}
          </div>
          <div className="flex-none">
            <div
              style={{
                width: `${PIXEL_SCALE * 11}px`,
                marginRight: `${PIXEL_SCALE * 2}px`,
              }}
            />
          </div>
        </div>
      </div>

      {/* content */}
      <div className="flex flex-col gap-1 overflow-y-auto scrollable pr-1">
        {/* instructions */}
        <Label type="default">
          {t("christmas-delivery-mayhem.instructions")}
        </Label>
        <div>
          <div className="flex items-center mb-3 mx-2">
            <SquareIcon
              icon={ITEM_DETAILS["Abandoned Bear"].image}
              width={10}
            />
            <p className="text-xs ml-3 flex-1">
              {t("christmas-delivery-mayhem.instructions1")}
            </p>
          </div>

          <div className="flex items-center mb-3 mx-2">
            <SquareIcon icon={SUNNYSIDE.icons.stopwatch} width={10} />
            <p className="text-xs ml-3 flex-1">
              {t("christmas-delivery-mayhem.instructions2")}
            </p>
          </div>

          <div className="flex items-center mb-3 mx-2">
            <SquareIcon
              icon={ITEM_DETAILS["Abandoned Bear"].image}
              width={10}
            />
            <p className="text-xs ml-3 flex-1">
              {t("christmas-delivery-mayhem.instructions3")}
            </p>
          </div>

          <div className="flex items-center mb-3 mx-2">
            <SquareIcon icon={SUNNYSIDE.icons.stopwatch} width={10} />
            <p className="text-xs ml-3 flex-1">
              {t("christmas-delivery-mayhem.instructions4")}
            </p>
          </div>

          <div className="flex items-center mb-3 mx-2">
            <SquareIcon icon={SUNNYSIDE.decorations.skull} width={10} />
            <p className="text-xs ml-3 flex-1">
              {t("christmas-delivery-mayhem.instructions5")}
            </p>
          </div>
        </div>
        {/* resources */}
        <Label type="default">{t("christmas-delivery-mayhem.resources")}</Label>
        <table className="w-full text-xs table-fixed border-collapse">
          <tbody>
            {Object.values(RESOURCES_TABLE).map(
              ({ item, description }, index) => (
                <tr key={index}>
                  <td
                    style={{ border: "1px solid #b96f50" }}
                    className="p-1.5 w-1/6"
                  >
                    <div className="flex items-center justify-center">
                      {<SquareIcon icon={item} width={13} />}
                    </div>
                  </td>
                  <td
                    style={{ border: "1px solid #b96f50" }}
                    className="p-1.5 w-5/6"
                  >
                    {t("christmas-delivery-mayhem.scoreDescription", {
                      description: description,
                    })}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {/* enemies */}
        <Label type="default">{t("christmas-delivery-mayhem.enemies")}</Label>
        <table className="w-full text-xs table-fixed border-collapse">
          <tbody>
            {Object.values(ELVES_TABLE).map(({ item, description }, index) => (
              <tr key={index}>
                <td
                  style={{ border: "1px solid #b96f50" }}
                  className="p-1.5 w-1/6"
                >
                  <div className="flex items-center justify-center">
                    {<SquareIcon icon={item} width={13} />}
                  </div>
                </td>
                <td
                  style={{ border: "1px solid #b96f50" }}
                  className="p-1.5 w-5/6"
                >
                  {t("christmas-delivery-mayhem.scoreDescription", {
                    description: description,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* signs */}
        <Label type="default">{t("christmas-delivery-mayhem.signs")}</Label>
        <table className="w-full text-xs table-fixed border-collapse">
          <tbody>
            {Object.values(EVENTS_TABLE).map(({ item, description }, index) => (
              <tr key={index}>
                <td
                  style={{ border: "1px solid #b96f50" }}
                  className="p-1.5 w-1/6"
                >
                  <div className="flex items-center justify-center">
                    {<SquareIcon icon={item} width={13} />}
                  </div>
                </td>
                <td
                  style={{ border: "1px solid #b96f50" }}
                  className="p-1.5 w-5/6"
                >
                  {t("christmas-delivery-mayhem.scoreDescription", {
                    description: description,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};