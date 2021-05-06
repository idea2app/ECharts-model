import 'array-unique-proposal';
import type { EChartOption } from 'echarts';

import { DataItem, minScaleOf } from './Data';

export interface KLineValue {
    open: number;
    close: number;
    low: number;
    high: number;
}

export class KLineDataItem extends DataItem<
    KLineValue,
    EChartOption.SeriesCandlestick['itemStyle']
> {}

export type XYAxisSeriesType = 'line' | 'bar' | 'candlestick';

export interface XYAxisDataItem {
    name?: string;
    value: number | number[];
    itemStyle: Record<string, any>;
}

export type XYAxisSeries = Omit<EChartOption.SeriesLine, 'type' | 'data'> &
    Omit<EChartOption.SeriesBar, 'type' | 'data'> &
    Omit<EChartOption.SeriesCandlestick, 'type' | 'data'> & {
        type: XYAxisSeriesType;
        data: (number | number[] | XYAxisDataItem)[];
    };

export interface DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: (DataItem | KLineDataItem)[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];
    gridIndex?: number;
}

export class DataSeries implements DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: (DataItem | KLineDataItem)[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];
    gridIndex?: number;

    constructor(option: DataSeriesOption) {
        this.type = option.type;
        this.name = option.name;
        this.unit = option.unit;
        this.data = option.data;
        this.itemStyle = option.itemStyle;
        this.areaStyle = option.areaStyle;
        this.gridIndex = option.gridIndex || 0;
    }
}

export interface XYAxisOption {
    data: DataSeries[];
    stacked?: boolean;
    xGrid?: number[];
    yGrid?: number[];
}

export class XYAxisModel implements XYAxisOption {
    data: DataSeries[];
    stacked?: boolean;
    xGrid?: number[];
    yGrid?: number[];

    constructor({ data, stacked, xGrid, yGrid }: XYAxisOption) {
        this.data = data;
        this.stacked = stacked;
        this.xGrid = xGrid;
        this.yGrid = yGrid;
    }

    renderXAxisLabel?: (value: string, index: number) => string;
    renderYAxisLabel?: (value: string, index: number) => string;

    renderXAxisPointerLabel?: (data: EChartOption.Tooltip.Format) => string;
    renderYAxisPointerLabel?: (data: EChartOption.Tooltip.Format) => string;

    renderTooltip?: EChartOption.Tooltip.Formatter;

    get xAxis() {
        const formatter =
            this.renderXAxisPointerLabel ||
            (this.renderXAxisLabel &&
                (({ value, dataIndex }: EChartOption.Tooltip.Format) =>
                    this.renderXAxisLabel(value + '', dataIndex)));

        return this.data
            .map(
                ({ gridIndex, data }, index) =>
                    (!index || gridIndex) &&
                    ({
                        type: 'category',
                        data: data.map(({ name }) => name),
                        gridIndex,
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
        const { yGrid = [1] } = this;
        const ySum = yGrid.reduce((sum, item) => sum + item, 0);
        const formatter =
            this.renderYAxisPointerLabel ||
            (this.renderYAxisLabel &&
                (({ value, dataIndex }: EChartOption.Tooltip.Format) =>
                    this.renderYAxisLabel(value + '', dataIndex)));

        return this.data
            .uniqueBy(({ unit }) => unit)
            .map(({ type, unit, data, gridIndex }) => {
                const show = yGrid[gridIndex] >= ySum / 2;
                const min =
                    type === 'bar'
                        ? undefined
                        : data[0] instanceof KLineDataItem
                        ? minScaleOf(
                              (data as KLineDataItem[]).map(
                                  ({ value: { low } }) => low
                              )
                          )
                        : minScaleOf(
                              (data as DataItem[]).map(({ value }) => value)
                          );

                return {
                    type: 'value',
                    min,
                    gridIndex,
                    name: unit,
                    nameTextStyle: {
                        color: show ? undefined : 'transparent',
                        align: unit && unit.length > 3 ? 'left' : 'right'
                    },
                    axisLabel: {
                        show,
                        formatter: this.renderYAxisLabel
                    },
                    axisPointer: {
                        label: { formatter }
                    }
                };
            });
    }

    get grid(): EChartOption.Grid[] {
        const { xGrid = [1], yGrid = [1] } = this,
            offset = 6;

        if (+xGrid === 1 && +yGrid === 1) return [{}];

        const xSum = xGrid.reduce((sum, item) => sum + item, 0),
            ySum = yGrid.reduce((sum, item) => sum + item, 0);

        return yGrid
            .map((scale, index) => {
                const top = `${
                        (yGrid
                            .slice(0, index)
                            .reduce((sum, item) => sum + item, 0) /
                            ySum) *
                            100 +
                        offset
                    }%`,
                    height = `${(scale / ySum) * 100 - offset * 2}%`;

                return xGrid.map((scale, index) => ({
                    left: `${
                        (xGrid
                            .slice(0, index)
                            .reduce((sum, item) => sum + item, 0) /
                            xSum) *
                            100 +
                        offset
                    }%`,
                    top,
                    width: `${(scale / xSum) * 100 - offset * 2}%`,
                    height
                }));
            })
            .flat();
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
            axisPointer: { type: 'cross' },
            formatter: this.renderTooltip
        };
    }

    valueOf() {
        const { data, xAxis, yAxis, grid, stacked, legend, tooltip } = this;

        const series: XYAxisSeries[] = data.map(
            ({ type, name, data, unit, itemStyle, areaStyle, gridIndex }) => ({
                type,
                name,
                data: data.map(({ value, style }) => {
                    const item =
                        typeof value === 'number'
                            ? value
                            : [value.open, value.close, value.low, value.high];

                    return style ? { value: item, itemStyle: style } : item;
                }),
                xAxisIndex: gridIndex,
                yAxisIndex: yAxis.findIndex(({ name }) => name === unit),
                symbol: type === 'line' ? 'none' : undefined,
                barMaxWidth: type === 'bar' ? 16 : undefined,
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
