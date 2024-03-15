import { BPTreeCondition } from 'src/impl/bptree/BPTree'
import { IBasicRecord, ICommandInputs } from './types'
import sharedWorkerUrl from '../workers/shared?sharedworker&url'
import workerUrl from '../workers/dedicated?worker&url'

let worker: Worker

export function getWorker() {
	if (!worker) {
		const sharedWorker = new SharedWorker(sharedWorkerUrl, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })

		worker = new Worker(workerUrl, { type: import.meta.env.MODE === 'production' ? 'classic' : 'module' })

		worker.postMessage({ workerPort: sharedWorker.port }, [sharedWorker.port])

		window.addEventListener('beforeunload', function () {
			worker.postMessage({ closing: true })
		})
	}
	return worker
}

export const sendCommand = <Command extends ICommandInputs<ReturnType>, ReturnType extends IBasicRecord = IBasicRecord>(
	command: Command
): Promise<ReturnType | ReturnType[] | string[] | void> =>
	new Promise((res, rej) => {
		const worker = getWorker()

		worker.onmessage = ({ data }) => {
			if (data.error) {
				rej(data.error)
			} else {
				res(data.result)
			}
		}

		worker.postMessage(command)
	})

export function getQueryFromCondition(type: string, val: string) {
	let op: keyof BPTreeCondition<any> | void = undefined
	switch (type) {
		case 'equals':
			op = 'equal'
			break
		case 'notEqual':
			op = 'notEqual'
			break
		case 'contains':
			op = 'like'
			val = `%${val}%`
			break
		case 'greaterThan':
			op = 'gt'
			break
		case 'greaterThanOrEqual':
			op = 'gte'
			break
		case 'lessThan':
			op = 'lt'
			break
		case 'lessThanOrEqual':
			op = 'lte'
			break
		default:
			console.error('unknown type:', type)
			break
	}
	return {
		[op!]: val,
	}
}
