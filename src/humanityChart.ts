import * as d3 from 'd3';
import {
  EVOLUTION_STAGES,
  MAX_EVOLUTION_LEVEL,
  computeHumanityMetrics,
} from './evolution';

export interface HumanityChartPoint {
  level: number;
  title: string;
  phaseLabel: string;
  humanityPercent: number;
  posturePercent: number;
  visagePercent: number;
  shedPercent: number;
  xpRequired: number;
  shrinesRequired: number;
  deltaFromPrev: number;
  achieved: boolean;
  current: boolean;
}

const PHASE_MARKERS: ReadonlyArray<{ level: number; label: string }> = [
  { level: 1, label: 'Primal Serpent' },
  { level: 5, label: 'Winged Wyrm' },
  { level: 8, label: 'Naga' },
  { level: 10, label: 'Awakening' },
  { level: 12, label: 'Human' },
];

export function buildHumanityProgressionSeries(currentLevel: number): HumanityChartPoint[] {
  const clampedLevel = Math.max(1, Math.min(MAX_EVOLUTION_LEVEL, Math.round(currentLevel)));
  const points: HumanityChartPoint[] = [];
  let prevPct = 0;

  for (const stage of EVOLUTION_STAGES) {
    const metrics = computeHumanityMetrics(
      stage.level,
      stage.shrinesRequired,
      MAX_EVOLUTION_LEVEL,
    );
    const delta = stage.level === 1 ? 0 : metrics.humanityPercent - prevPct;
    points.push({
      level: stage.level,
      title: stage.title,
      phaseLabel: metrics.phaseLabel,
      humanityPercent: metrics.humanityPercent,
      posturePercent: metrics.posturePercent,
      visagePercent: metrics.visagePercent,
      shedPercent: metrics.shedPercent,
      xpRequired: stage.xpRequired,
      shrinesRequired: stage.shrinesRequired,
      deltaFromPrev: delta,
      achieved: stage.level <= clampedLevel,
      current: stage.level === clampedLevel,
    });
    prevPct = metrics.humanityPercent;
  }

  return points;
}

function formatReadout(pt: HumanityChartPoint): string {
  const stateLabel = pt.current ? 'Current' : pt.achieved ? 'Unlocked' : 'Projected';
  const gain = pt.deltaFromPrev > 0 ? ` (+${pt.deltaFromPrev}%)` : '';
  const gate =
    pt.level === 1
      ? 'Start'
      : `${pt.xpRequired.toLocaleString()} XP · ${pt.shrinesRequired} Peak${pt.shrinesRequired === 1 ? '' : 's'}`;
  return `Tier ${pt.level} · ${pt.title} · ${pt.humanityPercent}% Humanity${gain} · ${stateLabel} (${gate})`;
}

/**
 * Renders an interactive D3 line chart inside the Evolution Summary modal
 * visualizing the growth of the player's Humanity stat across all 12 evolution tiers.
 */
export function renderHumanityGrowthChart(
  container: HTMLElement,
  readoutEl: HTMLElement | null,
  currentLevel: number,
  animate = true,
): void {
  const points = buildHumanityProgressionSeries(currentLevel);
  const achievedPoints = points.filter((p) => p.achieved);
  const currentPoint = points.find((p) => p.current) ?? points[0];

  const width = 780;
  const height = 188;
  const margin = { top: 24, right: 24, bottom: 30, left: 42 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const root = d3.select(container);
  root.selectAll('*').remove();

  const svg = root
    .append('svg')
    .attr('class', 'humanity-d3-svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr(
      'aria-label',
      `Humanity growth line chart across 12 evolution tiers. Currently at Tier ${currentPoint.level} (${currentPoint.title}) with ${currentPoint.humanityPercent}% Humanity.`,
    );

  const defs = svg.append('defs');

  // Horizontal jade-to-gold stroke gradient for the achieved growth curve
  const strokeGrad = defs
    .append('linearGradient')
    .attr('id', 'humanityGrowthStrokeGrad')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '100%')
    .attr('y2', '0%');
  strokeGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2ed489');
  strokeGrad.append('stop').attr('offset', '58%').attr('stop-color', '#86e39d');
  strokeGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f2c14e');

  // Soft vertical area fill under the achieved curve
  const areaGrad = defs
    .append('linearGradient')
    .attr('id', 'humanityGrowthAreaGrad')
    .attr('x1', '0%')
    .attr('y1', '0%')
    .attr('x2', '0%')
    .attr('y2', '100%');
  areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f2c14e').attr('stop-opacity', 0.24);
  areaGrad.append('stop').attr('offset', '48%').attr('stop-color', '#2ed489').attr('stop-opacity', 0.13);
  areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#2ed489').attr('stop-opacity', 0.0);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain([1, MAX_EVOLUTION_LEVEL]).range([0, innerW]);
  const yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

  // 1. Horizontal gridlines (0%, 25%, 50%, 75%, 100%)
  const yTicks = [0, 25, 50, 75, 100];
  g.append('g')
    .attr('class', 'hd3-grid')
    .selectAll('line')
    .data(yTicks)
    .join('line')
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', (d) => yScale(d))
    .attr('y2', (d) => yScale(d))
    .attr('stroke', (d) => (d === 0 ? 'rgba(182, 224, 206, 0.24)' : 'rgba(182, 224, 206, 0.1)'))
    .attr('stroke-width', 1);

  // 2. Subtle vertical metamorphosis phase markers
  const phaseGroup = g.append('g').attr('class', 'hd3-phases');
  PHASE_MARKERS.forEach((pm) => {
    const xPos = xScale(pm.level);
    if (pm.level > 1 && pm.level < MAX_EVOLUTION_LEVEL) {
      phaseGroup
        .append('line')
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', 'rgba(182, 224, 206, 0.11)')
        .attr('stroke-dasharray', '2 3');
    }
    phaseGroup
      .append('text')
      .attr('x', pm.level === MAX_EVOLUTION_LEVEL ? xPos : pm.level === 1 ? xPos : xPos + 4)
      .attr('y', -8)
      .attr('text-anchor', pm.level === MAX_EVOLUTION_LEVEL ? 'end' : 'start')
      .attr('class', 'hd3-phase-label')
      .text(pm.label);
  });

  // 3. Y-axis & X-axis via d3.axisLeft / d3.axisBottom
  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(yTicks)
    .tickSize(0)
    .tickPadding(8)
    .tickFormat((v) => `${v}%`);

  g.append('g')
    .attr('class', 'hd3-axis hd3-axis-y')
    .call(yAxis)
    .call((sel) => sel.select('.domain').remove());

  const xAxis = d3
    .axisBottom(xScale)
    .ticks(MAX_EVOLUTION_LEVEL)
    .tickValues(EVOLUTION_STAGES.map((s) => s.level))
    .tickSize(4)
    .tickPadding(7)
    .tickFormat((v) => `T${v}`);

  const xAxisG = g
    .append('g')
    .attr('class', 'hd3-axis hd3-axis-x')
    .attr('transform', `translate(0,${innerH})`)
    .call(xAxis);
  xAxisG.select('.domain').remove();
  xAxisG
    .selectAll<SVGTextElement, number>('text')
    .classed('is-current-tick', (d) => d === currentPoint.level)
    .classed('is-done-tick', (d) => d < currentPoint.level);

  // 4. D3 line & area generators
  const lineGen = d3
    .line<HumanityChartPoint>()
    .x((d) => xScale(d.level))
    .y((d) => yScale(d.humanityPercent))
    .curve(d3.curveMonotoneX);

  const areaGen = d3
    .area<HumanityChartPoint>()
    .x((d) => xScale(d.level))
    .y0(innerH)
    .y1((d) => yScale(d.humanityPercent))
    .curve(d3.curveMonotoneX);

  // Full 12-tier projected trajectory (dashed)
  g.append('path')
    .datum(points)
    .attr('class', 'hd3-projected-line')
    .attr('fill', 'none')
    .attr('d', lineGen);

  // Achieved area fill (tiers 1..currentLevel)
  if (achievedPoints.length >= 2) {
    g.append('path')
      .datum(achievedPoints)
      .attr('class', 'hd3-achieved-area')
      .attr('fill', 'url(#humanityGrowthAreaGrad)')
      .attr('d', areaGen);

    const achievedLine = g
      .append('path')
      .datum(achievedPoints)
      .attr('class', 'hd3-achieved-line')
      .attr('fill', 'none')
      .attr('stroke', 'url(#humanityGrowthStrokeGrad)')
      .attr('d', lineGen);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (animate && !prefersReducedMotion) {
      const totalLen = achievedLine.node()?.getTotalLength() ?? 0;
      if (totalLen > 0) {
        achievedLine
          .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
          .attr('stroke-dashoffset', totalLen)
          .transition()
          .duration(620)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', () => {
            achievedLine.attr('stroke-dasharray', null);
          });
      }
    }
  }

  // 5. Interactive vertical crosshair + focus ring (hidden until hovering/focusing)
  const hoverLine = g
    .append('line')
    .attr('class', 'hd3-hover-guide')
    .attr('y1', 0)
    .attr('y2', innerH)
    .attr('x1', xScale(currentPoint.level))
    .attr('x2', xScale(currentPoint.level))
    .style('opacity', 0);

  const hoverRing = g
    .append('circle')
    .attr('class', 'hd3-hover-ring')
    .attr('r', 8.5)
    .attr('cx', xScale(currentPoint.level))
    .attr('cy', yScale(currentPoint.humanityPercent))
    .style('opacity', 0);

  // 6. Tier data nodes
  const nodesG = g.append('g').attr('class', 'hd3-nodes');

  // Current tier soft halo
  nodesG
    .append('circle')
    .attr('class', 'hd3-current-halo')
    .attr('cx', xScale(currentPoint.level))
    .attr('cy', yScale(currentPoint.humanityPercent))
    .attr('r', 11);

  nodesG
    .selectAll('circle.hd3-dot')
    .data(points)
    .join('circle')
    .attr('class', (d) =>
      d.current ? 'hd3-dot is-current' : d.achieved ? 'hd3-dot is-done' : 'hd3-dot is-future',
    )
    .attr('cx', (d) => xScale(d.level))
    .attr('cy', (d) => yScale(d.humanityPercent))
    .attr('r', (d) => (d.current ? 5.6 : d.achieved ? 4 : 3.2));

  // Direct callout label on the player's current tier node
  const labelAnchor =
    currentPoint.level >= 11 ? 'end' : currentPoint.level <= 2 ? 'start' : 'middle';
  const labelDx = currentPoint.level >= 11 ? -10 : currentPoint.level <= 2 ? 10 : 0;
  const labelDy = currentPoint.humanityPercent >= 84 ? 20 : -13;

  g.append('text')
    .attr('class', 'hd3-current-callout')
    .attr('x', xScale(currentPoint.level) + labelDx)
    .attr('y', yScale(currentPoint.humanityPercent) + labelDy)
    .attr('text-anchor', labelAnchor)
    .text(`${currentPoint.humanityPercent}%`);

  // 7. Accessible hover/focus hit targets for all 12 tiers
  const setInspectPoint = (pt: HumanityChartPoint, active: boolean) => {
    if (readoutEl) {
      readoutEl.textContent = formatReadout(pt);
    }
    hoverLine
      .attr('x1', xScale(pt.level))
      .attr('x2', xScale(pt.level))
      .style('opacity', active ? 1 : 0);
    hoverRing
      .attr('cx', xScale(pt.level))
      .attr('cy', yScale(pt.humanityPercent))
      .style('opacity', active ? 1 : 0);
  };

  setInspectPoint(currentPoint, false);

  g.append('g')
    .attr('class', 'hd3-hit-targets')
    .selectAll('circle.hd3-hit')
    .data(points)
    .join('circle')
    .attr('class', 'hd3-hit')
    .attr('cx', (d) => xScale(d.level))
    .attr('cy', (d) => yScale(d.humanityPercent))
    .attr('r', 15)
    .attr('tabindex', 0)
    .attr('role', 'button')
    .attr(
      'aria-label',
      (d) => `Tier ${d.level}: ${d.title}, ${d.humanityPercent}% Humanity`,
    )
    .on('mouseenter', (_event, d) => setInspectPoint(d, true))
    .on('focus', (_event, d) => setInspectPoint(d, true))
    .on('click', (_event, d) => setInspectPoint(d, true))
    .on('mouseleave', () => setInspectPoint(currentPoint, false))
    .on('blur', () => setInspectPoint(currentPoint, false));
}
