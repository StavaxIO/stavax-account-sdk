export class Result<T> {
    constructor(private v: T, private err?: Error) {
    }

    get error(): Error | undefined {
        return this.err
    }

    get value(): T {
        return this.v
    }
}
