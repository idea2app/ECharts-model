import type { EChartOption } from 'echarts';

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

export interface DataSeriesOption<
    T extends string = string,
    D = DataItem,
    S extends Record<string, any> = Record<string, any>
> {
    type: T;
    name?: string;
    data: D[];
    itemStyle?: S;
}

export abstract class DataSeries<
    T extends string = string,
    D = DataItem,
    S extends Record<string, any> = Record<string, any>
> implements DataSeriesOption<T, D, S>
{
    type: T;
    name?: string;
    data: D[];
    itemStyle?: S;

    constructor({ type, name, data, itemStyle }: DataSeriesOption<T, D, S>) {
        this.type = type;
        this.name = name;
        this.data = data;
        this.itemStyle = itemStyle;
    }
}

export interface DataModelOption<T = DataSeries> {
    name?: string;
    data: T[];
}

export abstract class DataModel<T = DataSeries> implements DataModelOption<T> {
    name?: string;
    data: T[];

    constructor({ name, data }: DataModelOption<T>) {
        this.name = name;
        this.data = data.filter(Boolean);
    }

    renderLegend?: EChartOption.Legend.Formatter;
    renderTooltip?: EChartOption.Tooltip.Formatter;

    get title(): EChartOption['title'] | undefined {
        return this.name && { text: this.name, left: 'center' };
    }

    valueOf() {
        const { title } = this;

        return { title };
    }

    toJSON() {
        return this.valueOf();
    }
}
