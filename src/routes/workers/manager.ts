/* eslint-disable import/default */
import workerUrl from './dedicated?worker&url'
import sharedWorkerUrl from './shared?sharedworker&url'
import { WorkerManager } from 'opfsdb/WorkerManager'

export const { sendCommand } = new WorkerManager(workerUrl, sharedWorkerUrl, import.meta.env.MODE === 'production' ? 'classic' : 'module')
