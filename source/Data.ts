export function minScaleOf(data: number[]) {
    return Math.floor(Math.min(...data) / 100) * 100;
}

export class DataItem<T = number, S = Record<string, any>> {
    name: string;
    value: T;
    style?: S;

    constructor(name: string, value: T, style?: S) {
        this.name = name;
        this.value = value;
        this.style = style;
    }
}
