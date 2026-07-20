import type {
  SmartStayMarketContextObservationV2,
} from "./marketContextModel";

export const SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_VERSION_V2 =
  "1.0.0" as const;

export const SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_V2 = {
  version:
    SMARTSTAY_LOCAL_MARKET_CONTEXT_SEED_VERSION_V2,

  records:
    [] as readonly SmartStayMarketContextObservationV2[],
};
