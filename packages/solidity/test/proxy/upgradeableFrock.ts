import {
    SolcInput,
    SolcOutput,
    UpgradeableContract,
  } from "@openzeppelin/upgrades-core";
  import chai from "chai";
  import { artifacts } from "hardhat";
  
  const { expect } = chai;
  
  describe("Upgrade Frock Token", async () => {
    let solcInput: SolcInput;
    let solcOutput: SolcOutput;
    let currenctImpl: UpgradeableContract;
  
    interface Report {
      ok: boolean;
      explain(color?: boolean): string;
    }
  
    before(async () => {
      const buildInfo = await artifacts.getBuildInfo(
        "contracts/Token/FrockTokenV1.sol:FrockTokenV1"
      );
  
      if (buildInfo === undefined) {
        throw new Error("Build info not found");
      }
  
      solcInput = buildInfo.input;
      solcOutput = buildInfo.output;
  
      currenctImpl = new UpgradeableContract("FrockTokenV1", solcInput, solcOutput);
    });
  
    it("reports unsafe operation", async () => {
      const report = currenctImpl.getErrorReport() as Report;
  
      console.log(report.explain(true));
      expect(report.ok).to.equal(true);
    });
  
    it("reports storage upgrade errors", async () => {
      const newImpl = new UpgradeableContract(
        "FrockTokenNew",
        solcInput,
        solcOutput
      );
  
      const report = currenctImpl.getStorageUpgradeReport(newImpl);
      expect(report.ok).to.equal(true);
    });
  });