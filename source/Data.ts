export class DataItem<T = number> {
    name: string;
    value: T;

    constructor(name: string, value: T) {
        this.name = name;
        this.value = value;
    }
}
