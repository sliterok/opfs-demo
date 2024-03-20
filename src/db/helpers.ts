/* eslint-disable import/default */
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

		const channel = new MessageChannel()

		channel.port2.onmessage = ({ data }) => {
			if (data.error) {
				rej(data.error)
			} else {
				res(data.result)
				channel.port2.close()
			}
		}

		worker.postMessage({ port: channel.port1, command }, [channel.port1])
	})
