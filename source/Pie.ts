import type { EChartOption } from 'echarts';
import {
    DataSeries,
    DataSeriesOption,
    DataModel,
    DataModelOption
} from './Data';

export type PieSeriesType = 'round' | 'ring';

export interface PieSeriesOption extends DataSeriesOption<PieSeriesType> {
    mode?: 'percent' | 'value' | 'mix';
}

export class PieSeries
    extends DataSeries<PieSeriesType>
    implements PieSeriesOption
{
    mode: PieSeriesOption['mode'];

    constructor({ type, mode = 'percent', data }: PieSeriesOption) {
        super({ type, data });
        this.mode = mode;
    }
}

export interface PieModelOption extends DataModelOption<PieSeries> {
    direction?: 'horizontal' | 'vertical';
}

export class PieModel extends DataModel<PieSeries> implements PieModelOption {
    direction?: PieModelOption['direction'];

    constructor({ direction, ...option }: PieModelOption) {
        super(option);
        this.direction = direction;
    }

    get legend(): EChartOption['legend'] {
        return {
            orient: 'vertical',
            left: 'right',
            top: 'bottom',
            formatter: this.renderLegend
        };
    }

    get tooltip(): EChartOption['tooltip'] {
        return {
            trigger: 'item',
            formatter: this.renderTooltip
        };
    }

    get series(): EChartOption.SeriesPie[] {
        const { data, direction } = this;

        const radius = (1 / data.length / 2) * 100;
        const emphasis = {
            itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
        };
        const ringLabel = {
            avoidLabelOverlap: false,
            label: { show: false, position: 'center' },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 32,
                    fontWeight: 'bold'
                },
                ...emphasis
            },
            labelLine: { show: false }
        };

        return data.map(({ type, mode, data }, index) => {
            const isRing = type === 'ring',
                isRose = mode !== 'percent';
            const center = [`${((index * 2 + 1) * radius).toFixed(2)}%`, '50%'];

            if (direction === 'vertical') center.reverse();

            return {
                type: 'pie',
                radius: [isRing ? (isRose ? '10%' : '50%') : '0%', '85%'],
                roseType: !isRose
                    ? undefined
                    : mode === 'mix'
                    ? 'radius'
                    : 'area',
                center,
                emphasis,
                ...(isRing && !isRose ? ringLabel : null),
                data
            };
        });
    }

    valueOf() {
        const { title, legend, tooltip, series } = this;

        return { title, legend, tooltip, series };
    }
}
