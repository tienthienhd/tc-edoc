export interface Results<T> {
  reduce(arg0: (acc: any, folder: any) => any, arg1: {}): { [key: string]: string }
  count: number

  results: T[]

  all: number[]
}
