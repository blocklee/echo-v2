// ECHO: Battle of Potential — 合约测试配置
// 用于云子集成测试，替换占位符

const CONTRACTS = {
  CardMinting: {
    address: "0xc55B1af35C213aacc2b34333FeF4FE94278e98Ca",
    abiPath: "artifacts/contracts/CardMinting.sol/CardMinting.json"
  },
  DeckAssembly: {
    address: "0x461d4268686952B260AF6A98a11998f4176c2719",
    abiPath: "artifacts/contracts/DeckAssembly.sol/DeckAssembly.json"
  },
  PotentialOracle: {
    address: "0x31973c7E34bB9dfE43B714facc981366fFe20d9B",
    abiPath: "artifacts/contracts/PotentialOracle.sol/PotentialOracle.json"
  },
  BattleRevenue: {
    address: "0x611692084439B8D37482B6eE601c9D0108405D76",
    abiPath: "artifacts/contracts/BattleRevenue.sol/BattleRevenue.json"
  }
};

const RPC_URL = "https://qng.rpc.qitmeer.io";
const CHAIN_ID = 813;

module.exports = { CONTRACTS, RPC_URL, CHAIN_ID };
