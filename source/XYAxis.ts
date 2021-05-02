import 'array-unique-proposal';
import type { EChartOption } from 'echarts';

export class DataItem {
    name: string;
    value: number;

    constructor(name: string, value: number) {
        this.name = name;
        this.value = value;
    }
}

export type XYAxisSeriesType = 'line' | 'bar';

export type XYAxisSeries = Omit<EChartOption.SeriesLine, 'type'> &
    Omit<EChartOption.SeriesBar, 'type'> & {
        type: XYAxisSeriesType;
    };

export interface DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: DataItem[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];
}

export class DataSeries implements DataSeriesOption {
    type: XYAxisSeries['type'];
    name?: string;
    unit?: string;
    data: DataItem[];
    itemStyle?: XYAxisSeries['itemStyle'];
    areaStyle?: XYAxisSeries['areaStyle'];

    constructor(option: DataSeriesOption) {
        this.type = option.type;
        this.name = option.name;
        this.unit = option.unit;
        this.data = option.data;
        this.itemStyle = option.itemStyle;
        this.areaStyle = option.areaStyle;
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

    constructor(data: DataSeries[]) {
        this.data = data;
    }

    renderXAxisLabel?: (value: string, index: number) => string;

    renderXAxisPointerLabel?: (data: AxisPointerData) => string;

    valueOf() {
        const { data } = this;

        const xAxis: EChartOption.XAxis = {
            type: 'category',
            data: data[0].data.map(({ name }) => name),
            axisLabel: { formatter: this.renderXAxisLabel },
            axisPointer: {
                type: 'shadow',
                label: {
                    formatter:
                        this.renderXAxisPointerLabel ||
                        (({ value, dataIndex }: AxisPointerData) =>
                            this.renderXAxisLabel(value + '', dataIndex))
                }
            }
        };
        const yAxis: EChartOption.YAxis[] = data
            .uniqueBy(({ unit }) => unit)
            .map(({ unit }) => ({
                type: 'value',
                name: unit,
                nameTextStyle: { align: 'right' }
            }));
        const tags = data.map(({ name }) => name).filter(Boolean) as string[];

        const series: XYAxisSeries[] = data.map(
            ({ type, name, data, unit, itemStyle, areaStyle }) => ({
                type,
                name,
                data: data.map(({ value }) => value),
                yAxisIndex:
                    type !== 'line'
                        ? undefined
                        : yAxis.findIndex(({ name }) => name === unit),
                itemStyle,
                areaStyle
            })
        );
        const legend: EChartOption['legend'] = tags[0]
            ? {
                  data: tags,
                  bottom: '1rem'
              }
            : undefined;
        const tooltip: EChartOption['tooltip'] = {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        };
        return { xAxis, yAxis, series, tooltip, legend };
    }

    toJSON() {
        return this.valueOf();
    }
}
