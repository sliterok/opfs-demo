import { ITableKeys } from 'opfsdb'

export interface IConfig {
	keys: ITableKeys
}

export type ISearchInput = Record<string, string | number>

export interface IQueryUserKeysParams {
	searchInput: ISearchInput
	isAnd: boolean
	limit: number | null
}
