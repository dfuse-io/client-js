export declare type FirehoseHeader = {
  timestamp: {
    seconds: string
  },
  producer: string,
  previous: string,
  transactionMroot: string,
  actionMroot: string
};

export declare type FirehoseBlockrootMerkle = {
  nodeCount: number,
  activeNodes: Array<string>
};

export declare type FirehoseProducerInfo = {
  name: string,
  lastBlockNumProduced: number
};

export declare type FirehosePendingSchedule = {
  scheduleHash: string,
  scheduleV2: any
};

export declare type FirehoseProtocolFeatures = {
  protocolFeatures: Array<string>
};

export declare type FirehoseState = {
  averageBlockNetUsage: {
    lastOrdinal: number,
    valueEx: string,
    consumed: string
  },
  averageBlockCpuUsage: {
    lastOrdinal: number,
    valueEx: string,
    consumed: string
  },
  pendingNetUsage?: string,
  pendingCpuUsage?: string,
  totalNetWeight: string,
  totalCpuWeight: string,
  totalRamBytes: string,
  virtualNetLimit: string,
  virtualCpuLimit: string
};

export declare type FirehoseRlimitOps = {
  operation: string,
  state: FirehoseState
};

export declare type FirehoseKeys = {
  publicKey: string,
  weight: number
};

export declare type FirehoseValidBlockSigningAuthorityV2 = {
  v0: {
    threshold: number,
    keys: Array<FirehoseKeys>
  }
};

export declare type FirehoseActiveScheduleV2 = {
  accountName: string,
  blockSigningAuthority: FirehoseValidBlockSigningAuthorityV2
};

export declare type FirehoseAuthSequence = {
  accountName: string,
  sequence: string
};

export declare type FirehoseAuthorization = {
  actor: string,
  permission: string
};

export declare type FirehoseActionTrace = {
  receipt: {
    receiver: string,
    digest: string,
    globalSequence: string,
    authSequence: Array<FirehoseAuthSequence>,
    recvSequence: string,
    codeSequence: string,
    abiSequence: string
  },
  action: {
    account: string,
    name: string,
    authorization: Array<FirehoseAuthorization>,
    jsonData: string,
    rawData: string
  },
  elapsed: string,
  console?: string,
  transactionId: string,
  blockNum: string,
  blockTime: {
    seconds: string
  },
  receiver: string,
  actionOrdinal: number,
  filteringMatched?: boolean
};

export declare type FirehoseDbops = {
  operation: string,
  actionIndex?: number,
  code: string,
  scope: string,
  tableName: string,
  primaryKey: string,
  oldPayer: string,
  newPayer: string,
  oldData: string,
  newData: string
};

export declare type FirehoseRlimitOps2 = {
  operation: string,
  accountUsage: {
    owner: string,
    netUsage: {
      lastOrdinal: number,
      valueEx: string,
      consumed: string
    },
    cpuUsage: {
      lastOrdinal: number,
      valueEx: string,
      consumed: string
    },
    ramUsage: string
  }
};

export declare type FirehoseCreationTree = {
  creatorActionIndex?: number,
  executionActionIndex?: number
};

export declare type FirehoseFilteredTransactionTrace = {
  id: string,
  blockNum: string,
  blockTime: {
    seconds: string
  },
  producerBlockId: string,
  receipt: {
    status: string,
    cpuUsageMicroSeconds: number,
    netUsageWords: number
  },
  elapsed: string,
  netUsage: string,
  actionTraces: Array<FirehoseActionTrace>,
  dbOps: Array<FirehoseDbops>,
  rlimitOps: Array<FirehoseRlimitOps2>,
  creationTree: Array<FirehoseCreationTree>,
  index: string
};

export declare type FirehoseFilteredTransactions = {
  status: string,
  cpuUsageMicroSeconds: number,
  netUsageWords: number,
  id: string,
  packedTransaction: {
    signatures: Array<string>,
    packedTransaction: string
  }
};

export declare type FirehoseBlock = {
  id: string,
  number: number,
  version: number,
  header: FirehoseHeader
  producerSignature: string,
  dposProposedIrreversibleBlocknum: number,
  dposIrreversibleBlocknum: number,
  blockrootMerkle: FirehoseBlockrootMerkle,
  producerToLastProduced: Array<FirehoseProducerInfo>,
  producerToLastImpliedIrb: Array<FirehoseProducerInfo>,
  pendingSchedule: FirehosePendingSchedule,
  activatedProtocolFeatures: FirehoseProtocolFeatures,
  rlimitOps: Array<FirehoseRlimitOps>,
  unfilteredTransactionCount: number,
  unfilteredTransactionTraceCount: number,
  unfilteredExecutedInputActionCount: number,
  unfilteredExecutedTotalActionCount: number,
  validBlockSigningAuthorityV2: FirehoseValidBlockSigningAuthorityV2,
  activeScheduleV2: {
    producers: Array<FirehoseActiveScheduleV2>
  },
  filteringApplied: boolean,
  filteringIncludeFilterExpr: string,
  filteredTransactionTraceCount: number,
  filteredExecutedInputActionCount: number,
  filteredExecutedTotalActionCount: number,
  filteredTransactionTraces: Array<FirehoseFilteredTransactionTrace>,
  filteredTransactions: Array<FirehoseFilteredTransactions>,
  filteredTransactionCount: number
};
