import 'array-unique-proposal';
import type { EChartOption } from 'echarts';

import { DataItem } from './Data';

export interface KLineValue {
    open: number;
    close: number;
    low: number;
    high: number;
}

export class KLineDataItem extends DataItem<KLineValue> {}

export type XYAxisSeriesType = 'line' | 'bar' | 'candlestick';

export type XYAxisSeries = Omit<EChartOption.SeriesLine, 'type' | 'data'> &
    Omit<EChartOption.SeriesBar, 'type' | 'data'> &
    Omit<EChartOption.SeriesCandlestick, 'type' | 'data'> & {
        type: XYAxisSeriesType;
        data: (number | number[])[];
    };

export interface DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: (DataItem | KLineDataItem)[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];
    group?: number;
}

export class DataSeries implements DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: (DataItem | KLineDataItem)[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];
    group?: number;

    constructor(option: DataSeriesOption) {
        this.type = option.type;
        this.name = option.name;
        this.unit = option.unit;
        this.data = option.data;
        this.itemStyle = option.itemStyle;
        this.areaStyle = option.areaStyle;
        this.group = option.group || 0;
    }
}

/**
 * @see https://echarts.apache.org/en/option.html#xAxis.axisPointer.label.formatter
 */
export interface AxisPointerData {
    componentType: 'series';
    seriesType: XYAxisSeriesType;
    seriesIndex: number;
    seriesName: string;
    name: string;
    dataIndex: number;
    data: object;
    value: number | object[] | object;
    encode: Record<string, number[]>;
    dimensionNames?: string[];
    dimensionIndex?: number;
    color: string;
}

export class XYAxisModel {
    data: DataSeries[];
    stacked?: boolean;

    constructor(data: DataSeries[], stacked?: boolean) {
        this.data = data;
        this.stacked = stacked;
    }

    renderXAxisLabel?: (value: string, index: number) => string;
    renderYAxisLabel?: (value: string, index: number) => string;

    renderXAxisPointerLabel?: (data: AxisPointerData) => string;
    renderYAxisPointerLabel?: (data: AxisPointerData) => string;

    get xAxis() {
        const formatter =
            this.renderXAxisPointerLabel ||
            (this.renderXAxisLabel &&
                (({ value, dataIndex }: AxisPointerData) =>
                    this.renderXAxisLabel(value + '', dataIndex)));

        return this.data
            .map(
                ({ group, data }, index) =>
                    (!index || group) &&
                    ({
                        type: 'category',
                        data: data.map(({ name }) => name),
                        gridIndex: group,
                        axisLabel: { formatter: this.renderXAxisLabel },
                        axisPointer: {
                            type: 'shadow',
                            label: { formatter }
                        }
                    } as EChartOption.XAxis)
            )
            .filter(Boolean);
    }

    get yAxis(): EChartOption.YAxis[] {
        const formatter =
            this.renderYAxisPointerLabel ||
            (this.renderYAxisLabel &&
                (({ value, dataIndex }: AxisPointerData) =>
                    this.renderYAxisLabel(value + '', dataIndex)));

        return this.data
            .uniqueBy(({ unit }) => unit)
            .map(({ unit, group }) => ({
                type: 'value',
                name: unit,
                nameTextStyle: { align: 'right' },
                gridIndex: group,
                axisLabel: { formatter: this.renderYAxisLabel },
                axisPointer: {
                    label: { formatter }
                }
            }));
    }

    get grid(): EChartOption.Grid[] {
        const length = Math.max(...this.data.map(({ group }) => group)) + 1;

        return length === 1
            ? [{}]
            : Array.from(new Array(length), (_, index) => ({
                  top: `${index * (1 / length) * 100}%`,
                  height: `${(1 / length) * 100}%`
              }));
    }

    get legend(): EChartOption['legend'] | undefined {
        const tags = this.data
            .map(({ name }) => name)
            .filter(Boolean) as string[];

        return tags[0]
            ? {
                  data: tags,
                  bottom: '1rem'
              }
            : undefined;
    }

    get tooltip(): EChartOption.Tooltip {
        return {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        };
    }

    valueOf() {
        const { data, xAxis, yAxis, grid, stacked, legend, tooltip } = this;

        const series: XYAxisSeries[] = data.map(
            ({ type, name, data, unit, itemStyle, areaStyle, group }) => ({
                type,
                name,
                data: data.map(({ value }) =>
                    typeof value === 'number'
                        ? value
                        : [value.open, value.close, value.low, value.high]
                ),
                xAxisIndex: group,
                yAxisIndex: yAxis.findIndex(({ name }) => name === unit),
                itemStyle,
                areaStyle,
                stack: stacked ? type : undefined
            })
        );
        const axisPointer = { link: { xAxisIndex: 'all' } };

        return { xAxis, yAxis, grid, series, legend, tooltip, axisPointer };
    }

    toJSON() {
        return this.valueOf();
    }
}
