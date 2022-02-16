import path from 'path';

import { copy, pathExists, remove } from 'fs-extra';
import {
  TASK_CLEAN,
  TASK_COMPILE_SOLIDITY_COMPILE_JOBS,
} from 'hardhat/builtin-tasks/task-names';
import { subtask, task } from 'hardhat/config';

const COPY_TYPECHAIN_OUTDIR_TO_PATH = '../contracts/typechain/generated';

subtask(
  TASK_COMPILE_SOLIDITY_COMPILE_JOBS,
  'Copy typechain outDir to contracts package'
).setAction(async (taskArgs, { config, run }, runSuper) => {
  const compileSolOutput = await runSuper(taskArgs);

  const typechainIndexFilePath = path.resolve(
    config.typechain.outDir,
    'index.ts'
  );

  if (!(await pathExists(typechainIndexFilePath))) {
    await run('typechain');
  }

  await copy(config.typechain.outDir, COPY_TYPECHAIN_OUTDIR_TO_PATH);

  return compileSolOutput;
});

task(
  TASK_CLEAN,
  'Clears the cache and deletes all artifacts',
  async ({ global }: { global: boolean }, { config: _ }, runSuper) => {
    if (global) {
      return;
    }

    if (await pathExists(COPY_TYPECHAIN_OUTDIR_TO_PATH)) {
      await remove(COPY_TYPECHAIN_OUTDIR_TO_PATH);
    }

    await runSuper();
  }
);
