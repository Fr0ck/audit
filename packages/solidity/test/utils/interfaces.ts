import { HardhatRuntimeEnvironment } from 'hardhat/types';

export type Awaited<T> = T extends PromiseLike<infer U> ? U : T;
export type SignerWithAddress = Awaited<
  ReturnType<HardhatRuntimeEnvironment['ethers']['getSigner']>
>;