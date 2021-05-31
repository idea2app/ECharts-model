import 'array-unique-proposal';
import type { EChartOption } from 'echarts';
import {
    DataItem,
    DataSeriesOption,
    DataSeries,
    DataModelOption,
    DataModel
} from './Data';

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

export type XYAxisSeriesData = Omit<EChartOption.SeriesLine, 'type' | 'data'> &
    Omit<EChartOption.SeriesBar, 'type' | 'data'> &
    Omit<EChartOption.SeriesCandlestick, 'type' | 'data'> & {
        type: XYAxisSeriesType;
        data: (number | number[] | XYAxisDataItem)[];
    };

export interface XYAxisSeriesOption
    extends DataSeriesOption<
        XYAxisSeriesData['type'],
        DataItem | KLineDataItem,
        XYAxisSeriesData['itemStyle']
    > {
    unit?: string;
    lineStyle?: XYAxisSeriesData['lineStyle'];
    areaStyle?: XYAxisSeriesData['areaStyle'];
    gridIndex?: number;
}

export class XYAxisSeries
    extends DataSeries<
        XYAxisSeriesData['type'],
        DataItem | KLineDataItem,
        XYAxisSeriesData['itemStyle']
    >
    implements XYAxisSeriesOption
{
    unit?: string;
    lineStyle?: XYAxisSeriesData['lineStyle'];
    areaStyle?: XYAxisSeriesData['areaStyle'];
    gridIndex?: number;

    constructor(option: XYAxisSeriesOption) {
        super(option);
        this.unit = option.unit;
        this.itemStyle =
            option.data[0] instanceof KLineDataItem
                ? { color: 'red', color0: 'green', ...option.itemStyle }
                : option.itemStyle;
        this.lineStyle = option.lineStyle;
        this.areaStyle = option.areaStyle;
        this.gridIndex = option.gridIndex || 0;
    }
}

export interface XYAxisOption extends DataModelOption<XYAxisSeries> {
    stacked?: boolean;
    xGrid?: number[];
    yGrid?: number[];
}

export class XYAxisModel
    extends DataModel<XYAxisSeries>
    implements XYAxisOption
{
    stacked?: boolean;
    xGrid?: number[];
    yGrid?: number[];

    constructor({ data, stacked, xGrid, yGrid }: XYAxisOption) {
        super({ data });
        this.stacked = stacked;
        this.xGrid = xGrid;
        this.yGrid = yGrid;
    }

    get singleGrid() {
        const { xGrid = [1], yGrid = [1] } = this;

        return +xGrid === 1 && +yGrid === 1;
    }

    renderXAxisLabel?: (value: string, index: number) => string;
    renderYAxisLabel?: (value: string, index: number) => string;

    renderXAxisPointerLabel?: (data: EChartOption.Tooltip.Format) => string;
    renderYAxisPointerLabel?: (data: EChartOption.Tooltip.Format) => string;

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
            .map(({ type, unit, gridIndex }) => {
                const show = yGrid[gridIndex] >= ySum / 2;

                return {
                    type: 'value',
                    min: type === 'bar' ? undefined : 'dataMin',
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

        if (this.singleGrid) return [{}];

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

        return this.singleGrid && tags[0]
            ? {
                  data: tags,
                  bottom: '1rem',
                  formatter: this.renderLegend
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

        const series: XYAxisSeriesData[] = data.map(
            ({
                type,
                name,
                data,
                unit,
                itemStyle,
                lineStyle,
                areaStyle,
                gridIndex
            }) => ({
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
                lineStyle,
                areaStyle,
                stack: stacked ? type : undefined
            })
        );
        const axisPointer = { link: { xAxisIndex: 'all' } };

        return {
            ...super.valueOf(),
            xAxis,
            yAxis,
            grid,
            series,
            legend,
            tooltip,
            axisPointer
        };
    }
}
