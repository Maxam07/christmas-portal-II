import React, { useContext } from "react";
import { useSelector } from "@xstate/react";
import { PortalContext } from "../../lib/PortalProvider";
import { SUNNYSIDE } from "assets/sunnyside";
import { Label } from "components/ui/Label";
import { PortalMachineState } from "../../lib/christmasDeliveryMayhemMachine";
import { useAppTranslation } from "lib/i18n/useAppTranslations";

const _score = (state: PortalMachineState) => state.context.score;

export const ChristmasDeliveryMayhemScore: React.FC = () => {
  const { t } = useAppTranslation();

  const { portalService } = useContext(PortalContext);

  const score = useSelector(portalService, _score);

  return (
    <Label
      className="space-x-2 text-xs"
      icon={SUNNYSIDE.icons.stopwatch}
      type={"info"}
    >
      {t("christmas-delivery-mayhem.score", {
        score: score,
      })}
    </Label>
  );
};
