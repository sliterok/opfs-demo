/* eslint-disable no-console */
/* eslint-disable react/display-name */
import { ClientSuspense, useMutation } from 'rakkasjs'
import { ComponentType, Suspense, forwardRef, lazy, useMemo } from 'react'
import { ICreateTableInput, IDropInput, IImportInput, IInsertInput, IReadManyInput } from 'opfsdb'
import { IUser } from 'src/types'
import Chance from 'chance'
import { styled } from 'styled-components'
import { CustomContainerComponentProps, CustomItemComponentProps, Virtualizer } from 'virtua'
import { Facebook } from 'react-content-loader'
import { Page } from './Page'
import { Button } from 'src/components/common/button'
import { Input } from 'src/components/common/input'
import { useUnit } from 'effector-react'
import { cache } from '../../cache'
import {
	$config,
	$importStatus,
	$isAndQuery,
	$searchLimit,
	$userKeysLength,
	$userKeysPages,
	importCsvFile,
	readCsvFile,
	refetchUserKeys,
	setImportStatus,
	setIsAndQuery,
	setSearchLimit,
} from './model'
import { Item } from './Item'
import { TABLE_HEADER_HEIGHT, batchSize } from './shared'
import { Table } from './Table'
import { loadCsvFileFx, queryUserKeysFx } from './api'
import { sendCommand } from 'src/routes/workers/manager'

const chance = new Chance()

const HeaderContainer = styled.div`
	height: 3em;
	display: flex;
	gap: 1em;
`

const GlobalContainer = styled.div`
	height: 100svh;
	display: flex;
	flex-direction: column;
`

const GridContainer = styled.div`
	overflow-y: auto;
	width: 100svw;
`

const generateUser = () => {
	const [name, surname] = chance.name().split(' ')
	return {
		name,
		surname,
		id: crypto.randomUUID(),
		itemsBought: chance.integer({ min: 0, max: 500 }),
		address: chance.address(),
	}
}

const Skeleton = () => {
	return <Facebook style={{ height: '300px', display: 'block' }} />
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const LoadedPage = forwardRef<typeof Page, Parameters<typeof Page>[0]>((props, _ref) => <Page {...props} />)
const TableRef = forwardRef<HTMLTableElement, CustomContainerComponentProps>((props, ref) => <Table innerRef={ref} {...props} />)
const ItemRef = forwardRef<HTMLTableSectionElement, CustomItemComponentProps>((props, ref) => <Item innerRef={ref} {...props} />)

export default function MainLayout() {
	const config = useUnit($config)
	const [userKeysPages, userKeysLength, userKeysLoading] = useUnit([$userKeysPages, $userKeysLength, queryUserKeysFx.pending])
	const isCsvLoading = useUnit(loadCsvFileFx.pending)
	const importStatus = useUnit($importStatus)
	const limit = useUnit($searchLimit)
	const isAndQuery = useUnit($isAndQuery)

	const createUser = useMutation(
		async (record: IUser) => {
			await sendCommand<IInsertInput<IUser>, IUser>({
				name: 'insert',
				tableName: 'users',
				record,
			})
		},
		{
			onSettled() {
				refetchUserKeys()
			},
		}
	)

	const dropTable = useMutation(async () => {
		await sendCommand<IDropInput>({
			name: 'drop',
			tableName: 'users',
		})
	})

	const initTable = useMutation(async () => {
		await sendCommand<ICreateTableInput>({
			name: 'createTable',
			tableName: 'users',
			keys: config.keys,
		})
	})

	const importUsers = useMutation(
		async () => {
			const count = 1000
			const iters = 10
			for (let i = 0; i < iters; i++) {
				setImportStatus(((i + 1) * count).toString())
				const records = Array(count)
					.fill(true)
					.map(() => generateUser())

				await sendCommand<IImportInput<IUser>, IUser>({
					name: 'import',
					tableName: 'users',
					records,
				})
			}
		},
		{
			onSuccess() {
				refetchUserKeys()
			},
		}
	)

	const asyncPages = useMemo(
		() =>
			userKeysPages.map(ids => {
				const queryKey = ids.join(',')
				return {
					queryKey,
					LoadedPage: lazy(
						() =>
							new Promise<{
								default: ComponentType<Omit<Parameters<typeof Page>[0], 'users'>>
								// eslint-disable-next-line no-async-promise-executor
							}>(async resolve => {
								const restoredUsers = cache.get(queryKey) as IUser[] | void
								const users =
									restoredUsers ||
									((await sendCommand<IReadManyInput, IUser>({
										name: 'readMany',
										tableName: 'users',
										ids,
									})) as IUser[])
								if (!restoredUsers) cache.set(queryKey, users)
								// console.log(props.startIndex, ids.length, users.length)
								resolve({
									default: LoadedPage,
								})
							})
					),
				}
			}),
		[userKeysPages]
	)

	return (
		<GlobalContainer>
			<ClientSuspense fallback="Loading grid...">
				{
					<>
						<HeaderContainer>
							<Button disabled={userKeysLoading} onClick={() => refetchUserKeys()}>
								Refetch
							</Button>
							<Button
								disabled={createUser.isLoading}
								onClick={() => {
									createUser.mutate(generateUser())
								}}
							>
								Add user
							</Button>
							<Button
								disabled={importUsers.isLoading}
								onClick={() => {
									importUsers.mutate()
								}}
							>
								{importUsers.isLoading ? importStatus || 'Importing...' : 'Add 10k users'}
							</Button>
							<Input type="file" onChange={e => importCsvFile(e.target.files![0])}></Input>
							<Button
								disabled={isCsvLoading}
								onClick={() => {
									readCsvFile()
								}}
							>
								{isCsvLoading ? importStatus || 'Importing...' : 'Import CSV'}
							</Button>
							<Button
								disabled={initTable.isLoading}
								onClick={() => {
									initTable.mutate()
								}}
							>
								Init table
							</Button>
							<Button
								disabled={dropTable.isLoading}
								onClick={() => {
									dropTable.mutate()
								}}
							>
								Drop table
							</Button>
							<div>
								<div>Limit</div>
								<Input
									type="number"
									value={limit === null ? '' : limit}
									onChange={e => setSearchLimit(e.target.valueAsNumber)}
									onKeyDown={e => e.key === 'Enter' && refetchUserKeys()}
								/>
							</div>
							<div>
								<div>{userKeysLength || 0}</div>
								<div>results</div>
							</div>
							<div>
								<div>and</div>
								<Input type="checkbox" checked={isAndQuery} onChange={e => setIsAndQuery(e.target.checked)} />
							</div>
						</HeaderContainer>
						<GridContainer>
							<Virtualizer item={ItemRef} as={TableRef} startMargin={TABLE_HEADER_HEIGHT}>
								{asyncPages.map(({ queryKey, LoadedPage }, i) => (
									<Suspense
										key={i}
										fallback={
											<tr style={{ height: `${batchSize * 1.3725}em`, verticalAlign: 'top' }}>
												<td>
													<div>loading...</div>
													<Skeleton />
												</td>
											</tr>
										}
									>
										<LoadedPage startIndex={i * batchSize} queryKey={queryKey} />
									</Suspense>
								))}
							</Virtualizer>
						</GridContainer>
					</>
				}
			</ClientSuspense>
		</GlobalContainer>
	)
}
