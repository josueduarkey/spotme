/**
 * Gráficas SVG del panel de administración (react-native-svg, ya en el APK).
 * Specs: marcas delgadas con extremo de dato redondeado (4px) anclado a la
 * base, líneas de 2px, separación de 2px entre segmentos apilados, etiquetas
 * de valor en tinta de texto (nunca en el color de la serie), grid recesivo.
 * Paleta validada (CVD ΔE 108.8): primario #1A54A6 + acento #E67E22.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts, Radius, Spacing, Type } from '../constants/theme';

// ---------------------------------------------------------------------------
// Barras horizontales — magnitud por categoría (un solo tono, no identidad)
// ---------------------------------------------------------------------------

export interface DatoBarra {
  label: string;
  value: number;
}

interface BarrasProps {
  datos: DatoBarra[];
  width: number;
  color?: string;
}

/** Path de barra horizontal con solo el extremo derecho (dato) redondeado. */
function barraRedondeada(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w, h / 2);
  return `M${x},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h - rr} Q${x + w},${y + h} ${x + w - rr},${y + h} H${x} Z`;
}

export function GraficaBarras({ datos, width, color = Colors.primario }: BarrasProps) {
  const alturaBarra = 16;
  const gap = 14;
  const labelWidth = 92;
  const valueWidth = 30;
  const plotWidth = Math.max(10, width - labelWidth - valueWidth);
  const height = datos.length * (alturaBarra + gap) - gap + 4;
  const max = Math.max(1, ...datos.map((d) => d.value));

  return (
    <Svg width={width} height={height}>
      {datos.map((d, i) => {
        const y = i * (alturaBarra + gap) + 2;
        const w = Math.max(d.value > 0 ? 6 : 2, (d.value / max) * plotWidth);
        return (
          <React.Fragment key={d.label}>
            <SvgText
              x={labelWidth - 8}
              y={y + alturaBarra / 2 + 4}
              fontSize={11}
              fontFamily={Fonts.cuerpoMedium}
              fill={Colors.textoSuave}
              textAnchor="end">
              {d.label}
            </SvgText>
            {/* Riel de fondo recesivo */}
            <Rect x={labelWidth} y={y} width={plotWidth} height={alturaBarra} rx={4} fill={Colors.rellenoSuave} />
            <Path d={barraRedondeada(labelWidth, y, w, alturaBarra, 4)} fill={color} />
            {/* Etiqueta de valor en tinta de texto */}
            <SvgText
              x={labelWidth + w + 6}
              y={y + alturaBarra / 2 + 4}
              fontSize={11}
              fontFamily={Fonts.cuerpoBold}
              fill={Colors.texto}>
              {d.value}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Línea — cambio en el tiempo, serie única (sin leyenda: el título la nombra)
// ---------------------------------------------------------------------------

export interface PuntoLinea {
  label: string;
  value: number;
}

interface LineaProps {
  datos: PuntoLinea[];
  width: number;
  height?: number;
  color?: string;
}

export function GraficaLinea({ datos, width, height = 150, color = Colors.primario }: LineaProps) {
  const padTop = 18;
  const padBottom = 24;
  const padX = 14;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...datos.map((d) => d.value));
  const paso = datos.length > 1 ? plotW / (datos.length - 1) : 0;

  const puntos = datos.map((d, i) => ({
    x: padX + i * paso,
    y: padTop + plotH - (d.value / max) * plotH,
    ...d,
  }));

  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${linea} L${puntos[puntos.length - 1].x},${padTop + plotH} L${puntos[0].x},${padTop + plotH} Z`;
  const ultimo = puntos[puntos.length - 1];

  return (
    <Svg width={width} height={height}>
      {/* Grid recesivo: 3 líneas */}
      {[0, 0.5, 1].map((f) => (
        <Line
          key={f}
          x1={padX}
          x2={width - padX}
          y1={padTop + plotH * f}
          y2={padTop + plotH * f}
          stroke={Colors.borde}
          strokeWidth={1}
        />
      ))}
      <Path d={area} fill={color} opacity={0.12} />
      <Path d={linea} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {puntos.map((p) => (
        <Circle key={p.label + p.x} cx={p.x} cy={p.y} r={4} fill={color} stroke={Colors.superficie} strokeWidth={2} />
      ))}
      {/* Etiqueta directa solo en el último punto (selectiva) */}
      <SvgText
        x={Math.min(ultimo.x, width - padX - 4)}
        y={ultimo.y - 10}
        fontSize={12}
        fontFamily={Fonts.cuerpoBold}
        fill={Colors.texto}
        textAnchor="end">
        {ultimo.value}
      </SvgText>
      {/* Eje X: días */}
      {puntos.map((p) => (
        <SvgText
          key={'x' + p.label + p.x}
          x={p.x}
          y={height - 6}
          fontSize={10}
          fontFamily={Fonts.cuerpoMedium}
          fill={Colors.textoSuave}
          textAnchor="middle">
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Barra apilada — composición de 2-3 partes con leyenda (identidad)
// ---------------------------------------------------------------------------

export interface SegmentoApilado {
  label: string;
  value: number;
  color: string;
}

interface ApiladaProps {
  segmentos: SegmentoApilado[];
  width: number;
}

export function BarraApilada({ segmentos, width }: ApiladaProps) {
  const altura = 22;
  const gap = 2; // separación de 2px entre segmentos (spec)
  const total = Math.max(1, segmentos.reduce((s, x) => s + x.value, 0));
  const visibles = segmentos.filter((s) => s.value > 0);
  const plotW = width - gap * Math.max(0, visibles.length - 1);

  let x = 0;
  const rects = visibles.map((s, i) => {
    const w = (s.value / total) * plotW;
    const r = { ...s, x, w, primera: i === 0, ultima: i === visibles.length - 1 };
    x += w + gap;
    return r;
  });

  return (
    <View style={{ gap: Spacing.s }}>
      <Svg width={width} height={altura}>
        {rects.map((s) => (
          <Rect
            key={s.label}
            x={s.x}
            y={0}
            width={Math.max(2, s.w)}
            height={altura}
            fill={s.color}
            rx={4}
          />
        ))}
      </Svg>
      {/* Leyenda con valores en tinta de texto (obligatoria para ≥2 series) */}
      <View style={estilos.leyenda}>
        {segmentos.map((s) => (
          <View key={s.label} style={estilos.leyendaItem}>
            <View style={[estilos.swatch, { backgroundColor: s.color }]} />
            <Text style={estilos.leyendaTexto}>
              {s.label}: <Text style={estilos.leyendaValor}>{s.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.m },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: Radius.pill },
  leyendaTexto: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
  leyendaValor: { fontFamily: Fonts.cuerpoBold, color: Colors.texto },
});
