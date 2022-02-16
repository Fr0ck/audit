import CommunityOffering from "../deployments/fantom/CommunityOffering.json";
import CommunityOfferingNRT from "../deployments/fantom/CommunityOfferingNRT.json";
import USDC from "../deployments/fantom/USDC.json";
import FairPriceLaunchNRT from "../deployments/localhost/FairLaunchNRT.json";
import FairPriceLaunch from "../deployments/localhost/FairPriceLaunch.json";
import FrockProxy from "../deployments/localhost/FrockProxy.json";
import FrockTokenV1 from "../deployments/localhost/FrockTokenV1.json";

export const COMMUNITY_OFFERING_ADDR = CommunityOffering.address;
export const COMMUNITY_OFFERING_NRT_ADDR = CommunityOfferingNRT.address;
export const FAIR_PRICE_ADDR = FairPriceLaunch.address;
export const FAIR_PRICE_NRT_ADDR = FairPriceLaunchNRT.address;
export const USDC_ADDR = USDC.address;
export const FROCK_ADDR = FrockProxy.address;

export const CommunityOfferingABI = CommunityOffering.abi;
export const CommunityOfferingNRTABI = CommunityOfferingNRT.abi;
export const FairPriceLaunchABI = FairPriceLaunch.abi;
export const FairPriceLaunchNRTABI = FairPriceLaunchNRT.abi;
export const USDCoinABI = USDC.abi;
export const FrockABI = FrockTokenV1.abi;
