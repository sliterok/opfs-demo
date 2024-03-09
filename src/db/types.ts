import { Encoder } from 'cbor-x'
import { BPTreeCondition } from 'src/impl/bptree/BPTree'

export interface IBaseInput {
	tableName: string
}

export interface IInsertOptions extends IBaseInput {
	fullRecord?: boolean
}
export interface IInsertInput<T extends IBasicRecord = IBasicRecord> extends IInsertOptions {
	name: 'insert'
	record: T
}
export interface IQueryInput<T extends IBasicRecord = IBasicRecord> extends IBaseInput {
	name: 'query'
	tableName: string
	query: //Record<keyof T, BPTreeCondition<string | number> | never>
	{
		[key in keyof T]?: BPTreeCondition<string | number> | never
	}
	isAnd?: boolean
}
export interface ICreateTableInput extends IBaseInput {
	name: 'createTable'
	keys: string[]
}
export interface IDeleteInput extends IBaseInput {
	name: 'delete'
	id: string
}

export interface IReadInput extends IBaseInput {
	name: 'read'
	id: string
}

export interface IDropInput extends IBaseInput {
	name: 'drop'
}

export type ICommandInputs<T extends IBasicRecord | never = IBasicRecord> =
	| ICreateTableInput
	| IQueryInput<T>
	| IInsertInput<T>
	| IDeleteInput
	| IReadInput
	| IDropInput

export type ICommandInput<T extends ICommandInputs> = Omit<T, 'name'>
export type IFetchCommandInput<T extends ICommandInputs> = Omit<T, 'tableName' | 'name'>
export type IFetchDbUrl<T extends ICommandInputs> = `/db/${string}/${T['name']}`
export type IFetchDb = <T extends ICommandInputs<J>, J extends IBasicRecord = IBasicRecord>(
	url: IFetchDbUrl<T>,
	body: IFetchCommandInput<T>
) => Promise<J[] | void>

export type IBasicRecord = {
	id: string
	[key: string]: any
}

export interface IEncoder extends Encoder {
	decodeKeys: (tag: any) => any
}
