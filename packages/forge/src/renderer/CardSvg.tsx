import React from 'react';
import type { AssetPack } from '../assets/assetPack.js';
import { layoutSupportFor, rendererLayoutFor } from '../domain/frameSupport.js';
import type { ArtManifestRecord, CardFaceRecord, CardRecord, ExportProfile } from '../domain/schemas.js';
import { parseManaCostTokens } from '../domain/mana.js';
import type { ReferenceCatalog } from '../reference/catalog.js';
import { wrapText } from './text.js';

type RenderableArt = ArtManifestRecord & { dataUri?: string };
type RenderZone = { x: number; y: number; w: number; h: number };

interface CardSvgProps {
  card: CardRecord;
  face: CardFaceRecord;
  art?: RenderableArt;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
  referenceCatalog?: ReferenceCatalog;
}

export function CardSvg({ card, face, art, assetPack, exportProfile, referenceCatalog }: CardSvgProps): React.ReactElement {
  const isPlaneswalker = face.frameType.includes('planeswalker') || face.typeLine.includes('Planeswalker');
  const layoutSupport = layoutSupportFor(card.layout);
  const layoutName = rendererLayoutFor(card, face);
  const layout = assetPack.getLayoutMap(layoutName);
  if (!layout) {
    throw new Error(`Asset pack ${assetPack.manifest.packId} has no ${layoutName} layout map.`);
  }
  const { width, height } = layout.canvas;
  const zones = layout.zones;
  const title = zones.name;
  const mana = zones.mana_cost;
  const artZone = zones.art;
  const type = zones.type_line;
  const rules = zones.rules_text;
  const pt = zones.pt;
  const footer = zones.footer;
  const typography = typographyForCanvas(width);
  const rulesLayoutOptions = rulesTextLayoutOptionsFromFace(face, typography);
  const rulesLayout = layoutRulesText(
    displayRulesText(face.oracleText, card.name),
    displayRulesText(face.flavorText, card.name),
    typography,
    rules.h,
    rules.w,
    rulesLayoutOptions
  );
  const colors = colorsFrom(face.colors ?? card.colorIdentity);
  const color = preferredColorVariant(colors);
  const fallbackColor = colors[0] ?? 'C';
  const palette = colorToPalette(color);
  const frameRole =
    resolveRoleWithFallback(assetPack, { role: 'frame.full_card', layout: face.frameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'frame.full_card', layout: card.layout, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'frame.full_card', layout: layoutSupport.fallbackFrameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'frame.full_card', layout: layoutName, color, fallbackColor });
  const borderColor = borderColorFromLayoutVariant(face.layoutVariant);
  const borderMaskRole =
    resolveRoleWithFallback(assetPack, { role: 'mask.border', layout: face.frameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.border', layout: card.layout, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.border', layout: layoutSupport.fallbackFrameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.border', layout: layoutName, color, fallbackColor });
  const artMaskRole =
    resolveRoleWithFallback(assetPack, { role: 'mask.art', layout: face.frameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.art', layout: card.layout, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.art', layout: layoutSupport.fallbackFrameType, color, fallbackColor }) ??
    resolveRoleWithFallback(assetPack, { role: 'mask.art', layout: layoutName, color, fallbackColor });
  const setCode = card.setCode.toLowerCase();
  const setSymbolRole =
    assetPack.resolveRole({ role: 'symbol.set', symbol: `${setCode}-${rarityCode(card.rarity).toLowerCase()}` }) ??
    assetPack.resolveRole({ role: 'symbol.set', symbol: setCode });
  const manaTokens = parseManaCost(face.manaCost);
  const titleText = truncateForBox(card.name, typography.titleMaxChars);
  const typeText = truncateForBox(face.typeLine, typography.typeMaxChars);
  const titleFontSize = fitFontSize(titleText, typography.titleMax, typography.titleMin, title.w - 12);
  const typeFontSize = fitFontSize(typeText, typography.typeMax, typography.typeMin, type.w - 46);
  const isTokenFrame = Boolean(frameRole?.id.includes('frame-token'));
  const shouldCoverPlaceholderText = assetPack.manifest.renderHints.coverPlaceholderText;
  const shouldOverlayArtOverFrame = face.frameType === 'token_full_art' ? false : assetPack.manifest.renderHints.overlayArtOverFrame;
  const ptBoxPlacement = ptBoxPlacementFor(pt, assetPack.manifest.renderHints.ptBoxUsesZone);
  const titleInk = face.frameType === 'token_full_art' ? '#121417' : isTokenFrame ? '#f6efe5' : '#121417';
  const footerInk = shouldCoverPlaceholderText ? '#f1eee3' : '#2a2e34';
  const footerMutedInk = shouldCoverPlaceholderText ? '#d7d2c6' : '#41464f';
  const useMagicFooter = typography.compact && Boolean(frameRole?.dataUri);
  const fontCss = fontFaceCss(assetPack);
  const titleFont = "'BelerenForge', Georgia, serif";
  const bodyFont = "'MPlantinForge', Georgia, serif";

  if (isPlaneswalker) {
    return (
      <PlaneswalkerCardSvg
        card={card}
        face={face}
        art={art}
        assetPack={assetPack}
        exportProfile={exportProfile}
        width={width}
        height={height}
        title={title}
        mana={mana}
        artZone={artZone}
        type={type}
        rules={rules}
        pt={pt}
        footer={footer}
        typography={typography}
        palette={palette}
        frameRole={frameRole}
        borderMaskRole={borderMaskRole}
        borderColor={borderColor}
        setSymbolRole={setSymbolRole}
        manaTokens={manaTokens}
        titleText={titleText}
        typeText={typeText}
        titleFontSize={Math.min(16.5, titleFontSize)}
        typeFontSize={Math.min(13.5, typeFontSize)}
        fontCss={fontCss}
        titleFont={titleFont}
        bodyFont={bodyFont}
        color={color}
        fallbackColor={fallbackColor}
      />
    );
  }

  if (face.frameType === 'token_full_art') {
    return (
      <FullArtTokenCardSvg
        card={card}
        face={face}
        art={art}
        assetPack={assetPack}
        exportProfile={exportProfile}
        width={width}
        height={height}
        title={title}
        artZone={artZone}
        type={type}
        rules={rules}
        pt={pt}
        footer={footer}
        typography={typography}
        palette={palette}
        frameRole={frameRole}
        borderMaskRole={borderMaskRole}
        borderColor={borderColor}
        setSymbolRole={setSymbolRole}
        titleText={titleText}
        typeText={typeText}
        titleFont={titleFont}
        bodyFont={bodyFont}
        fontCss={fontCss}
        color={color}
        fallbackColor={fallbackColor}
        referenceCatalog={referenceCatalog}
      />
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {fontCss ? <style>{fontCss}</style> : null}
        <linearGradient id="cardBody" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={palette.bodyTop} />
          <stop offset="54%" stopColor="#f7f4ec" />
          <stop offset="100%" stopColor={palette.bodyBottom} />
        </linearGradient>
        <linearGradient id="artGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={palette.artTop} />
          <stop offset="58%" stopColor={palette.artMid} />
          <stop offset="100%" stopColor={palette.artBottom} />
        </linearGradient>
        <filter id="softShadow" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.23" />
        </filter>
        <clipPath id="placeholderArtClip">
          <rect x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} rx="8" />
        </clipPath>
        {artMaskRole?.dataUri ? (
          <mask id="artImageMask" maskUnits="userSpaceOnUse" x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h}>
            <rect x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} fill="black" />
            <image href={artMaskRole.dataUri} x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} preserveAspectRatio="none" />
          </mask>
        ) : null}
      </defs>

      {frameRole?.dataUri ? (
        <>
          <rect width={width} height={height} rx="28" fill={frameCanvasFill(borderColor, Boolean(borderMaskRole?.dataUri))} />
          {!shouldOverlayArtOverFrame ? <PlaceholderArt artZone={artZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} framed={Boolean(frameRole.dataUri)} masked={Boolean(artMaskRole?.dataUri)} /> : null}
          <FrameImage role={frameRole} borderMaskRole={borderMaskRole} borderColor={borderColor} width={width} height={height} />
          {shouldOverlayArtOverFrame ? <PlaceholderArt artZone={artZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} framed={Boolean(frameRole.dataUri)} masked={Boolean(artMaskRole?.dataUri)} /> : null}
          {shouldCoverPlaceholderText ? (
            <PlaceholderFieldCovers
              title={title}
              mana={mana}
              type={type}
              rules={rules}
              pt={pt}
              footer={footer}
              color={color}
              coverPt={Boolean(face.power && face.toughness)}
            />
          ) : null}
        </>
      ) : (
        <FallbackFrame width={width} height={height} title={title} mana={mana} palette={palette} />
      )}
      <text x={title.x + typography.titleX} y={fieldTextBaselineY(title, titleFontSize)} fontFamily={titleFont} fontSize={titleFontSize} fontWeight="700" fill={titleInk}>
        {titleText}
      </text>
      {manaTokens.length > 0 ? (
        <g>
          {manaTokens.map((token, index) => {
            const cx = mana.x + mana.w - typography.mana / 2 - typography.manaInset - index * typography.manaSpacing;
            return (
              <g key={`${token}-${index}`}>
                <ManaSymbol token={token} x={cx - typography.mana / 2} y={mana.y + typography.manaY} size={typography.mana} assetPack={assetPack} />
              </g>
            );
          })}
        </g>
      ) : null}

      {!frameRole?.dataUri ? <PlaceholderArt artZone={artZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} masked={Boolean(artMaskRole?.dataUri)} /> : null}

      {!frameRole?.dataUri ? (
        <>
          <rect x={type.x} y={type.y} width={type.w} height={type.h} rx="11" fill="#f8f7f1" stroke="#15171b" strokeWidth="2" />
          <rect x={type.x + 2} y={type.y + 2} width="14" height={type.h - 4} rx="7" fill={palette.accent} opacity="0.86" />
        </>
      ) : null}
      <text x={type.x + typography.typeX} y={fieldTextBaselineY(type, typeFontSize)} fontFamily={titleFont} fontSize={typeFontSize} fontWeight="700" fill="#15171b">
        {typeText}
      </text>
      {setSymbolRole?.dataUri && !useMagicFooter ? (
        <image href={setSymbolRole.dataUri} x={type.x + type.w - typography.setSymbolX} y={type.y + typography.setSymbolY} width={typography.setSymbol} height={typography.setSymbol} preserveAspectRatio="xMidYMid meet" />
      ) : null}

      {!frameRole?.dataUri ? (
        <>
          <rect x={rules.x} y={rules.y} width={rules.w} height={rules.h} rx="14" fill="#fffefa" stroke="#15171b" strokeWidth="2" />
          <line x1={rules.x + 22} y1={rules.y + 48} x2={rules.x + rules.w - 22} y2={rules.y + 48} stroke={palette.accent} strokeWidth="2" opacity="0.35" />
        </>
      ) : null}
      <RulesText
        lines={rulesLayout.oracleLines}
        x={rules.x + typography.rulesX + rulesLayout.paddingLeft}
        y={rules.y + rulesLayout.oracleY}
        lineHeight={rulesLayout.lineHeight}
        fontSize={rulesLayout.fontSize}
        symbolSize={rulesLayout.symbolSize}
        fontFamily={bodyFont}
        fontStyle="normal"
        assetPack={assetPack}
      />
      {rulesLayout.separatorY ? (
        <line
          x1={rules.x + typography.rulesX + rulesLayout.paddingLeft}
          y1={rules.y + rulesLayout.separatorY}
          x2={rules.x + rules.w - typography.rulesX - rulesLayout.paddingRight}
          y2={rules.y + rulesLayout.separatorY}
          stroke="#8a826f"
          strokeWidth="1.4"
          opacity="0.56"
        />
      ) : null}
      <RulesText
        lines={rulesLayout.flavorLines}
        x={rules.x + typography.rulesX + rulesLayout.paddingLeft}
        y={rules.y + rulesLayout.flavorY}
        lineHeight={rulesLayout.lineHeight}
        fontSize={rulesLayout.fontSize}
        symbolSize={rulesLayout.symbolSize}
        fontFamily={bodyFont}
        fontStyle="italic"
        assetPack={assetPack}
      />
      {face.power && face.toughness ? (
        <>
          {frameRole?.dataUri && !shouldCoverPlaceholderText ? (
            <AssetImage
              role={resolveRoleWithFallback(assetPack, { role: 'frame.pt_box', layout: face.frameType, color, fallbackColor })}
              x={ptBoxPlacement.x}
              y={ptBoxPlacement.y}
              width={ptBoxPlacement.width}
              height={ptBoxPlacement.height}
            />
          ) : null}
          {!frameRole?.dataUri ? (
            <>
              <rect x={pt.x - 4} y={pt.y - 4} width={pt.w + 8} height={pt.h + 8} rx="14" fill="#15171b" opacity="0.92" />
              <rect x={pt.x} y={pt.y} width={pt.w} height={pt.h} rx="11" fill="#fcfbf7" stroke={palette.accent} strokeWidth="4" />
            </>
          ) : null}
          <text x={pt.x + pt.w / 2} y={pt.y + typography.ptY} textAnchor="middle" fontFamily={titleFont} fontSize={typography.pt} fontWeight="800" fill="#111318">
            {face.power}/{face.toughness}
          </text>
        </>
      ) : null}
      {footer ? (
        useMagicFooter ? (
          <MagicFooter card={card} footer={footer} exportProfile={exportProfile} />
        ) : (
        <>
          <text x={footer.x} y={footer.y + typography.footerY} fontFamily="Arial, sans-serif" fontSize={typography.footer} fontWeight="700" fill={footerInk}>
            {card.setCode} {card.collectorNumber}
          </text>
          <text x={footer.x + typography.footerArtistX} y={footer.y + typography.footerY} fontFamily="Arial, sans-serif" fontSize={typography.footer} fill={footerMutedInk}>
            {face.artistDisplay ?? art?.artist ?? 'Unknown Artist'}
          </text>
          <text x={footer.x + footer.w} y={footer.y + typography.footerY} textAnchor="end" fontFamily="Arial, sans-serif" fontSize={typography.footerSmall} fontWeight="700" fill={palette.accent}>
            NOT FOR SALE
          </text>
        </>
        )
      ) : null}
    </svg>
  );
}

function FullArtTokenCardSvg({
  card,
  face,
  art,
  assetPack,
  exportProfile,
  width,
  height,
  title,
  artZone,
  type,
  rules,
  pt,
  footer,
  typography,
  palette,
  frameRole,
  borderMaskRole,
  borderColor,
  setSymbolRole,
  titleText,
  typeText,
  titleFont,
  bodyFont,
  fontCss,
  color,
  fallbackColor,
  referenceCatalog
}: {
  card: CardRecord;
  face: CardFaceRecord;
  art?: RenderableArt;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
  width: number;
  height: number;
  title: RenderZone;
  artZone: RenderZone;
  type: RenderZone;
  rules: RenderZone;
  pt: RenderZone;
  footer?: RenderZone;
  typography: Typography;
  palette: FramePalette;
  frameRole: ReturnType<AssetPack['resolveRole']>;
  borderMaskRole: ReturnType<AssetPack['resolveRole']>;
  borderColor: RenderBorderColor;
  setSymbolRole: ReturnType<AssetPack['resolveRole']>;
  titleText: string;
  typeText: string;
  titleFont: string;
  bodyFont: string;
  fontCss: string;
  color: string;
  fallbackColor: string;
  referenceCatalog?: ReferenceCatalog;
}): React.ReactElement {
  const tokenTitleFontSize = fitFontSize(titleText, typography.titleMax, typography.titleMin, title.w - 32);
  const tokenTypeFontSize = fitFontSize(typeText, 16, 11, type.w - 48);
  const baseRulesLayoutOptions = rulesTextLayoutOptionsFromFace(face, typography);
  const rulesLayoutOptions = {
    ...baseRulesLayoutOptions,
    paddingTop: Math.max(0, baseRulesLayoutOptions.paddingTop)
  };
  const rulesLayout = layoutRulesText(
    displayRulesText(face.oracleText, card.name),
    displayRulesText(face.flavorText, card.name),
    typography,
    rules.h,
    rules.w,
    rulesLayoutOptions
  );
  const ptBoxPlacement = ptBoxPlacementFor(pt, assetPack.manifest.renderHints.ptBoxUsesZone);

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {fontCss ? <style>{fontCss}</style> : null}
        <linearGradient id="artGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={palette.artTop} />
          <stop offset="58%" stopColor={palette.artMid} />
          <stop offset="100%" stopColor={palette.artBottom} />
        </linearGradient>
        <clipPath id="placeholderArtClip">
          <rect x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} rx="0" />
        </clipPath>
      </defs>

      <rect width={width} height={height} rx="18" fill={frameCanvasFill(borderColor, Boolean(borderMaskRole?.dataUri))} />
      <PlaceholderArt artZone={artZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} framed />
      <FrameImage role={frameRole} borderMaskRole={borderMaskRole} borderColor={borderColor} width={width} height={height} />

      <text x={title.x + title.w / 2} y={fieldTextBaselineY(title, tokenTitleFontSize)} textAnchor="middle" fontFamily={titleFont} fontSize={tokenTitleFontSize} fontWeight="700" fill="#111318">
        {titleText}
      </text>
      <text x={type.x + 6} y={fieldTextBaselineY(type, tokenTypeFontSize)} fontFamily={titleFont} fontSize={tokenTypeFontSize} fontWeight="700" fill="#15171b">
        {typeText}
      </text>
      {setSymbolRole?.dataUri ? (
        <image href={setSymbolRole.dataUri} x={type.x + type.w - 24} y={type.y + 1} width="18" height="18" preserveAspectRatio="xMidYMid meet" />
      ) : null}

      {face.oracleText || face.flavorText ? (
        <>
          <RulesText
            lines={rulesLayout.oracleLines}
            x={rules.x + 6 + rulesLayout.paddingLeft}
            y={rules.y + rulesLayout.oracleY}
            lineHeight={rulesLayout.lineHeight}
            fontSize={rulesLayout.fontSize}
            symbolSize={rulesLayout.symbolSize}
            fontFamily={bodyFont}
            fontStyle="normal"
            assetPack={assetPack}
          />
          {rulesLayout.separatorY ? (
            <line
              x1={rules.x + 8 + rulesLayout.paddingLeft}
              y1={rules.y + rulesLayout.separatorY}
              x2={rules.x + rules.w - 8 - rulesLayout.paddingRight}
              y2={rules.y + rulesLayout.separatorY}
              stroke="#8a826f"
              strokeWidth="1.2"
              opacity="0.52"
            />
          ) : null}
          <RulesText
            lines={rulesLayout.flavorLines}
            x={rules.x + 6 + rulesLayout.paddingLeft}
            y={rules.y + rulesLayout.flavorY}
            lineHeight={rulesLayout.lineHeight}
            fontSize={rulesLayout.fontSize}
            symbolSize={rulesLayout.symbolSize}
            fontFamily={bodyFont}
            fontStyle="italic"
            assetPack={assetPack}
          />
        </>
      ) : null}

      {face.power && face.toughness ? (
        <>
          <AssetImage
            role={resolveRoleWithFallback(assetPack, { role: 'frame.pt_box', layout: face.frameType, color, fallbackColor })}
            x={ptBoxPlacement.x}
            y={ptBoxPlacement.y}
            width={ptBoxPlacement.width}
            height={ptBoxPlacement.height}
          />
          <text x={pt.x + pt.w / 2} y={pt.y + typography.ptY} textAnchor="middle" fontFamily={titleFont} fontSize={typography.pt} fontWeight="800" fill="#111318">
            {face.power}/{face.toughness}
          </text>
        </>
      ) : null}
      {footer ? <MagicFooter card={card} footer={footer} exportProfile={exportProfile} /> : null}
    </svg>
  );
}

function PlaneswalkerCardSvg({
  card,
  face,
  art,
  assetPack,
  exportProfile,
  width,
  height,
  title,
  mana,
  artZone,
  type,
  rules,
  pt,
  footer,
  typography,
  palette,
  frameRole,
  borderMaskRole,
  borderColor,
  setSymbolRole,
  manaTokens,
  titleText,
  typeText,
  titleFontSize,
  typeFontSize,
  fontCss,
  titleFont,
  bodyFont,
  color,
  fallbackColor
}: {
  card: CardRecord;
  face: CardFaceRecord;
  art?: RenderableArt;
  assetPack: AssetPack;
  exportProfile: ExportProfile;
  width: number;
  height: number;
  title: RenderZone;
  mana: RenderZone;
  artZone: RenderZone;
  type: RenderZone;
  rules: RenderZone;
  pt: RenderZone;
  footer?: RenderZone;
  typography: Typography;
  palette: FramePalette;
  frameRole: ReturnType<AssetPack['resolveRole']>;
  borderMaskRole: ReturnType<AssetPack['resolveRole']>;
  borderColor: RenderBorderColor;
  setSymbolRole: ReturnType<AssetPack['resolveRole']>;
  manaTokens: string[];
  titleText: string;
  typeText: string;
  titleFontSize: number;
  typeFontSize: number;
  fontCss: string;
  titleFont: string;
  bodyFont: string;
  color: string;
  fallbackColor: string;
}): React.ReactElement {
  const abilityRows = parsePlaneswalkerAbilityRows(displayRulesText(face.oracleText, card.name));
  const hasFourAbilities = abilityRows.length > 3;
  const frameLayout = hasFourAbilities ? 'normal_planeswalker_4' : 'normal_planeswalker';
  const walkerFrameRole = resolveRoleWithFallback(assetPack, { role: 'frame.full_card', layout: frameLayout, color, fallbackColor }) ?? frameRole;
  const typeZone: RenderZone = hasFourAbilities ? { ...type, y: 261 } : type;
  const topArtZone: RenderZone = {
    ...artZone,
    h: Math.max(1, typeZone.y - artZone.y - 5)
  };
  const rows = planeswalkerAbilityPlacements(hasFourAbilities);
  const abilityFontSize = hasFourAbilities ? 12.1 : 12.8;
  const abilityLineHeight = hasFourAbilities ? 12.8 : 13.8;
  const abilityTextX = rules.x + 6;
  const abilityMaxChars = Math.max(28, Math.floor((rules.w - 12) / (abilityFontSize * 0.51)));

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        {fontCss ? <style>{fontCss}</style> : null}
        <linearGradient id="artGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={palette.artTop} />
          <stop offset="58%" stopColor={palette.artMid} />
          <stop offset="100%" stopColor={palette.artBottom} />
        </linearGradient>
        <clipPath id="placeholderArtClip">
          <rect x={topArtZone.x} y={topArtZone.y} width={topArtZone.w} height={topArtZone.h} rx="4" />
        </clipPath>
      </defs>

      <rect width={width} height={height} rx="28" fill={frameCanvasFill(borderColor, Boolean(borderMaskRole?.dataUri))} />
      {walkerFrameRole?.dataUri ? (
        <>
          <FrameImage role={walkerFrameRole} borderMaskRole={borderMaskRole} borderColor={borderColor} width={width} height={height} />
          <PlaceholderArt artZone={topArtZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} framed />
        </>
      ) : (
        <>
          <FallbackFrame width={width} height={height} title={title} mana={mana} palette={palette} />
          <PlaceholderArt artZone={artZone} palette={palette} artDataUri={art?.dataUri} transform={art?.transform} crop={art?.crop} />
        </>
      )}

      <text x={title.x + 7} y={fieldTextBaselineY(title, titleFontSize)} fontFamily={titleFont} fontSize={titleFontSize} fontWeight="700" fill="#111318">
        {titleText}
      </text>
      {manaTokens.length > 0 ? (
        <g>
          {manaTokens.map((token, index) => {
            const cx = mana.x + mana.w - 10 - index * 17;
            return <ManaSymbol key={`${token}-${index}`} token={token} x={cx - 8} y={mana.y + 3} size={16} assetPack={assetPack} />;
          })}
        </g>
      ) : null}

      <text x={typeZone.x + 6} y={fieldTextBaselineY(typeZone, typeFontSize)} fontFamily={titleFont} fontSize={typeFontSize} fontWeight="700" fill="#15171b">
        {typeText}
      </text>
      {setSymbolRole?.dataUri ? (
        <image href={setSymbolRole.dataUri} x={typeZone.x + typeZone.w - 24} y={typeZone.y + 1} width="18" height="18" preserveAspectRatio="xMidYMid meet" />
      ) : null}

      <g>
        {abilityRows.map((ability, index) => {
          const placement = rows[index] ?? rows[rows.length - 1];
          const lines = wrapText(ability.text, abilityMaxChars).slice(0, hasFourAbilities ? 3 : 4);
          return (
            <g key={`${ability.cost}-${index}`}>
              <AssetImage
                role={loyaltyRoleForCost(assetPack, ability.cost, frameLayout, color, fallbackColor)}
                x={18}
                y={placement.boxY}
                width={42}
                height={40}
              />
              <text x={38.5} y={placement.costY} textAnchor="middle" fontFamily={titleFont} fontSize="11" fontWeight="700" fill="#ffffff">
                {normalizeLoyaltyCost(ability.cost)}
              </text>
              <text x={61.5} y={placement.colonY} textAnchor="middle" fontFamily={bodyFont} fontSize="15" fill="#111318">
                :
              </text>
              <RulesText
                lines={lines}
                x={abilityTextX}
                y={placement.textY}
                lineHeight={abilityLineHeight}
                fontSize={abilityFontSize}
                symbolSize={abilityFontSize + 1}
                fontFamily={bodyFont}
                fontStyle="normal"
                assetPack={assetPack}
              />
            </g>
          );
        })}
      </g>

      {face.loyalty ? (
        <>
          <AssetImage
            role={resolveRoleWithFallback(assetPack, { role: 'frame.loyalty_box', layout: 'normal_planeswalker', color, fallbackColor })}
            x={pt.x - 8}
            y={pt.y - 2}
            width={60}
            height={38}
          />
          <text x={pt.x + 6.5} y={pt.y + 23} textAnchor="middle" fontFamily={titleFont} fontSize="15" fontWeight="800" fill="#ffffff">
            {face.loyalty}
          </text>
        </>
      ) : null}

      {footer ? <MagicFooter card={card} footer={footer} exportProfile={exportProfile} /> : null}
    </svg>
  );
}

function parsePlaneswalkerAbilityRows(oracleText?: string): Array<{ cost: string; text: string }> {
  const parsed = (oracleText ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([+\-−]?(?:\d+|X)|0)\s*:?\s*(.*)$/i);
      if (!match) {
        return { cost: '0', text: line };
      }
      return {
        cost: normalizeLoyaltyCost(match[1] ?? '0'),
        text: match[2] ?? ''
      };
    });
  const defaults = [
    { cost: '+1', text: '' },
    { cost: '-2', text: '' },
    { cost: '-7', text: '' }
  ];
  const rows = parsed.length > 0 ? parsed : defaults;
  return rows.slice(0, 4);
}

function planeswalkerAbilityPlacements(hasFourAbilities: boolean): Array<{ boxY: number; costY: number; colonY: number; textY: number }> {
  if (hasFourAbilities) {
    return [
      { boxY: 295, costY: 318, colonY: 318, textY: 318 },
      { boxY: 342, costY: 365, colonY: 365, textY: 365 },
      { boxY: 389, costY: 412, colonY: 412, textY: 412 },
      { boxY: 436, costY: 459, colonY: 459, textY: 459 }
    ];
  }
  return [
    { boxY: 333, costY: 356, colonY: 356, textY: 356 },
    { boxY: 383, costY: 406, colonY: 406, textY: 406 },
    { boxY: 432, costY: 455, colonY: 455, textY: 455 }
  ];
}

function loyaltyRoleForCost(
  assetPack: AssetPack,
  cost: string,
  layout: string,
  color: string,
  fallbackColor: string
): ReturnType<AssetPack['resolveRole']> {
  const normalized = normalizeLoyaltyCost(cost);
  const role = normalized.startsWith('+') ? 'frame.loyalty_up' : normalized.startsWith('-') ? 'frame.loyalty_down' : 'frame.loyalty_zero';
  return resolveRoleWithFallback(assetPack, { role, layout, color, fallbackColor }) ?? resolveRoleWithFallback(assetPack, { role, layout: 'normal_planeswalker', color, fallbackColor });
}

function normalizeLoyaltyCost(cost: string): string {
  return cost.trim().replace('−', '-').toUpperCase();
}

function isRareLike(rarity?: string): boolean {
  return ['rare', 'mythic', 'special', 'bonus'].includes((rarity ?? '').toLowerCase());
}

function resolveRoleWithFallback(
  assetPack: AssetPack,
  args: { role: string; layout?: string; color: string; fallbackColor: string }
): ReturnType<AssetPack['resolveRole']> {
  return (
    assetPack.resolveRole({ role: args.role, layout: args.layout, color: args.color }) ??
    assetPack.resolveRole({ role: args.role, layout: args.layout, color: args.fallbackColor }) ??
    assetPack.resolveRole({ role: args.role, layout: args.layout })
  );
}

function AssetImage({
  role,
  x,
  y,
  width,
  height
}: {
  role: ReturnType<AssetPack['resolveRole']>;
  x: number;
  y: number;
  width: string | number;
  height: string | number;
}): React.ReactElement | null {
  if (!role?.dataUri) {
    return null;
  }
  return <image href={role.dataUri} x={x} y={y} width={width} height={height} preserveAspectRatio="none" />;
}

type RenderBorderColor = 'black' | 'white' | 'white-mse' | 'silver' | 'gold' | 'borderless' | 'none';

function FrameImage({
  role,
  borderMaskRole,
  borderColor,
  width,
  height
}: {
  role: ReturnType<AssetPack['resolveRole']>;
  borderMaskRole: ReturnType<AssetPack['resolveRole']>;
  borderColor: RenderBorderColor;
  width: number;
  height: number;
}): React.ReactElement | null {
  if (!role?.dataUri) {
    return null;
  }
  if (borderColor === 'black') {
    return <image href={role.dataUri} x="0" y="0" width={width} height={height} preserveAspectRatio="none" data-frame-border-color="black" data-frame-border-mode="source" />;
  }

  if (usesMseBorderMask(borderColor) && borderMaskRole?.dataUri) {
    const paint = borderPaint(borderColor);
    return <MaskedFrameImage role={role} borderMaskRole={borderMaskRole} borderColor={borderColor} paint={paint} width={width} height={height} />;
  }

  return <image href={role.dataUri} x="0" y="0" width={width} height={height} preserveAspectRatio="none" data-frame-border-color={borderColor} data-frame-border-mode="unsupported-source" />;
}

function MaskedFrameImage({
  role,
  borderMaskRole,
  borderColor,
  paint,
  width,
  height
}: {
  role: NonNullable<ReturnType<AssetPack['resolveRole']>>;
  borderMaskRole: NonNullable<ReturnType<AssetPack['resolveRole']>>;
  borderColor: RenderBorderColor;
  paint: { stroke: string; highlight?: string };
  width: number;
  height: number;
}): React.ReactElement {
  return (
    <g data-frame-border-color={borderColor} data-frame-border-mode="mse-border-mask">
      <defs>
        <filter id="frameBorderMaskInvert" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues="1 0" />
            <feFuncG type="table" tableValues="1 0" />
            <feFuncB type="table" tableValues="1 0" />
          </feComponentTransfer>
        </filter>
        <mask id="frameBorderMask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <image href={borderMaskRole.dataUri} x="0" y="0" width={width} height={height} preserveAspectRatio="none" />
        </mask>
        <mask id="frameBorderInteriorMask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
          <image href={borderMaskRole.dataUri} x="0" y="0" width={width} height={height} preserveAspectRatio="none" filter="url(#frameBorderMaskInvert)" />
        </mask>
      </defs>
      <rect width={width} height={height} fill={paint.stroke} mask="url(#frameBorderMask)" />
      {paint.highlight ? <rect width={width} height={height} fill={paint.highlight} opacity="0.18" mask="url(#frameBorderMask)" /> : null}
      <image href={role.dataUri} x="0" y="0" width={width} height={height} preserveAspectRatio="none" mask="url(#frameBorderInteriorMask)" />
    </g>
  );
}

function borderColorFromLayoutVariant(layoutVariant: string | undefined): RenderBorderColor {
  const match = String(layoutVariant ?? '').match(/(?:^|;)border=([^;]+)/);
  const value = match?.[1]?.trim();
  if (value === 'white' || value === 'white-mse' || value === 'silver' || value === 'gold' || value === 'borderless' || value === 'none') {
    return value;
  }
  return 'black';
}

function borderPaint(borderColor: RenderBorderColor): { stroke: string; highlight?: string } {
  switch (borderColor) {
    case 'white':
    case 'white-mse':
      return { stroke: '#f7f4e8', highlight: '#ffffff' };
    case 'silver':
      return { stroke: '#b7c0ca', highlight: '#f3f6f8' };
    case 'gold':
      return { stroke: '#c99a2e', highlight: '#ffe8a3' };
    default:
      return { stroke: '#08090b' };
  }
}

function usesMseBorderMask(borderColor: RenderBorderColor): boolean {
  return borderColor === 'white-mse' || borderColor === 'silver' || borderColor === 'gold';
}

function frameCanvasFill(borderColor: RenderBorderColor, hasBorderMask: boolean): string {
  if (borderColor === 'borderless' || borderColor === 'none') {
    return 'transparent';
  }
  if (borderColor !== 'black' && !(usesMseBorderMask(borderColor) && hasBorderMask)) {
    return borderPaint('black').stroke;
  }
  return borderPaint(borderColor).stroke;
}

interface Typography {
  compact: boolean;
  titleMin: number;
  titleMax: number;
  titleMaxChars: number;
  titleX: number;
  titleY: number;
  mana: number;
  manaInset: number;
  manaSpacing: number;
  manaY: number;
  typeMin: number;
  typeMax: number;
  typeMaxChars: number;
  typeX: number;
  setSymbol: number;
  setSymbolX: number;
  setSymbolY: number;
  rules: number;
  rulesX: number;
  rulesY: number;
  rulesLineHeight: number;
  rulesSymbol: number;
  ruleWrap: number;
  maxRuleLines: number;
  pt: number;
  ptY: number;
  footer: number;
  footerSmall: number;
  footerY: number;
  footerArtistX: number;
}

function typographyForCanvas(width: number): Typography {
  if (width <= 420) {
    return {
      compact: true,
      titleMin: 12,
      titleMax: 21,
      titleMaxChars: 38,
      titleX: 7,
      titleY: 18,
      mana: 16,
      manaInset: 2,
      manaSpacing: 17,
      manaY: 3,
      typeMin: 10,
      typeMax: 17,
      typeMaxChars: 48,
      typeX: 6,
      setSymbol: 16,
      setSymbolX: 20,
      setSymbolY: 4,
      rules: 14.8,
      rulesX: 0,
      rulesY: 20,
      rulesLineHeight: 17,
      rulesSymbol: 15,
      ruleWrap: 45,
      maxRuleLines: 9,
      pt: 15,
      ptY: 19,
      footer: 7,
      footerSmall: 6,
      footerY: 10,
      footerArtistX: 50
    };
  }

  return {
    compact: false,
    titleMin: 18,
    titleMax: 42,
    titleMaxChars: 42,
    titleX: 18,
    titleY: 31,
    mana: 28,
    manaInset: 7,
    manaSpacing: 31,
    manaY: 8,
    typeMin: 15,
    typeMax: 34,
    typeMaxChars: 56,
    typeX: 29,
    setSymbol: 30,
    setSymbolX: 42,
    setSymbolY: 6,
    rules: 20,
    rulesX: 22,
    rulesY: 44,
    rulesLineHeight: 26,
    rulesSymbol: 21,
    ruleWrap: 48,
    maxRuleLines: 12,
    pt: 25,
    ptY: 31,
    footer: 13,
    footerSmall: 11,
    footerY: 20,
    footerArtistX: 92
  };
}

function fontFaceCss(assetPack: AssetPack): string {
  const title = assetPack.resolveRole({ role: 'font.title' })?.dataUri;
  const body = assetPack.resolveRole({ role: 'font.body' })?.dataUri;
  const bodyItalic = assetPack.resolveRole({ role: 'font.body_italic' })?.dataUri;
  return [
    title ? `@font-face{font-family:'BelerenForge';src:url("${title}") format("truetype");font-weight:700;}` : '',
    body ? `@font-face{font-family:'MPlantinForge';src:url("${body}") format("truetype");font-weight:400;}` : '',
    bodyItalic ? `@font-face{font-family:'MPlantinForge';src:url("${bodyItalic}") format("truetype");font-style:italic;}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function fieldTextBaselineY(zone: RenderZone, fontSize: number): number {
  const opticalBaseline = zone.y + zone.h / 2 + fontSize * 0.34;
  return clamp(opticalBaseline, zone.y + fontSize * 0.76, zone.y + zone.h - fontSize * 0.12);
}

function MagicFooter({
  card,
  footer,
  exportProfile
}: {
  card: CardRecord;
  footer: { x: number; y: number; w: number; h: number };
  exportProfile: ExportProfile;
}): React.ReactElement {
  const note = (exportProfile.watermarkText?.trim() || 'Not For Sale').replace(/^custom playtest\s*-?\s*/i, '');
  const displayName = card.name.length > 22 ? `${card.name.slice(0, 20)}...` : card.name;
  return (
    <g>
      <text x={footer.x} y={footer.y + 8} fontFamily="Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#f2ead8">
        {card.collectorNumber} {rarityCode(card.rarity)}  {note}
      </text>
      <text x={footer.x} y={footer.y + 16} fontFamily="Arial, sans-serif" fontSize="5.8" fontWeight="700" fill="#f2ead8">
        {card.setCode} - EN  {displayName}
      </text>
      <text x={footer.x + footer.w} y={footer.y + 8} textAnchor="end" fontFamily="Georgia, serif" fontSize="5.8" fontWeight="700" fill="#f2ead8">
        Kyle - Homebrew Forge
      </text>
      <text x={footer.x + footer.w} y={footer.y + 16} textAnchor="end" fontFamily="Georgia, serif" fontSize="5.8" fill="#f2ead8">
        Made for homebrew
      </text>
    </g>
  );
}

function rarityCode(rarity?: string): string {
  switch ((rarity ?? '').toLowerCase()) {
    case 'mythic':
      return 'M';
    case 'rare':
      return 'R';
    case 'uncommon':
      return 'U';
    case 'common':
      return 'C';
    case 'special':
    case 'bonus':
      return 'S';
    case 'token':
      return 'T';
    default:
      return 'C';
  }
}

function ptBoxPlacementFor(
  pt: { x: number; y: number; w: number; h: number },
  usesZone: boolean
): { x: number; y: number; width: string; height: string } {
  if (usesZone) {
    return {
      x: pt.x - 13,
      y: pt.y - 3,
      width: String(pt.w + 21),
      height: String(pt.h + 14)
    };
  }

  return {
    x: pt.x - 74,
    y: pt.y - 16,
    width: '165',
    height: '57'
  };
}

function PlaceholderFieldCovers({
  title,
  mana,
  type,
  rules,
  pt,
  footer,
  color,
  coverPt
}: {
  title: { x: number; y: number; w: number; h: number };
  mana: { x: number; y: number; w: number; h: number };
  type: { x: number; y: number; w: number; h: number };
  rules: { x: number; y: number; w: number; h: number };
  pt: { x: number; y: number; w: number; h: number };
  footer?: { x: number; y: number; w: number; h: number };
  color: string;
  coverPt: boolean;
}): React.ReactElement {
  const fill = fieldCoverFill(color);
  return (
    <g>
      <rect x={title.x + 10} y={title.y + 9} width={title.w + 26} height={title.h - 18} fill={fill.header} />
      <rect x={mana.x - 34} y={mana.y - 1} width={mana.w + 40} height={mana.h + 2} fill={fill.header} />
      <rect x={type.x + 3} y={type.y + 8} width={type.w - 6} height={type.h - 16} fill={fill.header} />
      <rect x={rules.x - 8} y={rules.y - 18} width={rules.w + 24} height={rules.h + 60} fill={fill.text} />
      {coverPt ? <rect x={pt.x - 4} y={pt.y + 12} width={pt.w + 28} height={pt.h + 18} rx="6" fill={fill.header} /> : null}
      {footer ? <rect x={footer.x - 6} y={footer.y - 8} width={footer.w + 12} height={footer.h + 16} fill="#17140f" opacity="0.96" /> : null}
    </g>
  );
}

function ManaSymbol({
  token,
  x,
  y,
  assetPack,
  size = 28
}: {
  token: string;
  x: number;
  y: number;
  assetPack: AssetPack;
  size?: number;
}): React.ReactElement {
  const imageRole = assetPack.resolveRole({ role: 'symbol.mana', symbol: normalizeManaToken(token) });
  if (imageRole?.dataUri) {
    return <image href={imageRole.dataUri} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid meet" />;
  }
  const radius = size / 2;
  const fontSize = Math.max(10, size * 0.57);
  return (
    <>
      <circle cx={x + radius} cy={y + radius} r={radius} fill={manaFill(token)} stroke="#14161a" strokeWidth="2" />
      <text x={x + radius} y={y + radius + fontSize * 0.38} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={fontSize} fontWeight="700" fill={manaInk(token)}>
        {token}
      </text>
    </>
  );
}

function RulesText({
  lines,
  x,
  y,
  lineHeight,
  fontSize,
  symbolSize,
  fontFamily,
  fontStyle,
  assetPack
}: {
  lines: RulesDisplayLine[];
  x: number;
  y: number;
  lineHeight: number;
  fontSize: number;
  symbolSize: number;
  fontFamily: string;
  fontStyle: 'normal' | 'italic';
  assetPack: AssetPack;
}): React.ReactElement {
  let parentheticalDepth = 0;
  let cursorY = y;
  const parsedLines = lines.map((line, lineIndex) => {
    const displayLine = normalizeRulesDisplayLine(line);
    cursorY += displayLine.gapBefore;
    const parsed = parseRuleLineParts(displayLine.text, fontStyle, parentheticalDepth);
    parentheticalDepth = parsed.parentheticalDepth;
    const lineY = cursorY;
    cursorY += lineHeight;
    return {
      key: `${displayLine.text}-${lineIndex}`,
      parts: parsed.parts,
      text: displayLine.text,
      y: lineY
    };
  });
  return (
    <g>
      {parsedLines.map((line, lineIndex) => (
        <RuleLine
          key={line.key}
          parts={line.parts}
          lineText={line.text}
          x={x}
          y={line.y}
          fontSize={fontSize}
          symbolSize={symbolSize}
          fontFamily={fontFamily}
          assetPack={assetPack}
        />
      ))}
    </g>
  );
}

function RuleLine({
  parts,
  lineText,
  x,
  y,
  fontSize,
  symbolSize,
  fontFamily,
  assetPack
}: {
  parts: RuleLinePart[];
  lineText: string;
  x: number;
  y: number;
  fontSize: number;
  symbolSize: number;
  fontFamily: string;
  assetPack: AssetPack;
}): React.ReactElement {
  const standaloneKeyword = isStandaloneKeywordLine(stripRuleMarkup(lineText));
  if (parts.every((part) => part.kind === 'text')) {
    return (
      <text x={x} y={y} fontFamily={fontFamily} fontSize={fontSize} fill="#14161a" xmlSpace="preserve">
        {parts.map((part, index) => {
          if (part.kind !== 'text') {
            return null;
          }
          return (
            <tspan
              key={`${part.text}-${index}`}
              fontStyle={part.fontStyle}
              fontWeight={standaloneKeyword || part.emphasis ? 700 : undefined}
              opacity={part.opacity}
            >
              {part.text}
            </tspan>
          );
        })}
      </text>
    );
  }

  let cursor = x;
  return (
    <g>
      {parts.map((part, index) => {
        if (part.kind === 'mana') {
          const gapBefore = cursor === x ? 0 : Math.max(2.4, fontSize * 0.16);
          const symbolX = cursor + gapBefore;
          const image = <ManaSymbol key={`${part.token}-${index}`} token={part.token} x={symbolX} y={y - symbolSize + 3} size={symbolSize} assetPack={assetPack} />;
          cursor = symbolX + symbolSize + Math.max(2, fontSize * 0.12);
          return image;
        }
        const text = (
          <text
            key={`${part.text}-${index}`}
            x={cursor}
            y={y}
            fontFamily={fontFamily}
            fontSize={fontSize}
            fontStyle={part.fontStyle}
            fontWeight={standaloneKeyword || part.emphasis ? 700 : undefined}
            fill="#14161a"
            opacity={part.opacity}
            xmlSpace="preserve"
          >
            {part.text}
          </text>
        );
        cursor += estimateRuleTextWidth(part.text, fontSize, part.fontStyle);
        return text;
      })}
    </g>
  );
}

type RulesDisplayLine = string | { text: string; gapBefore?: number };
type WrappedRulesLine = { text: string; gapBefore: number };

type RuleLinePart =
  | { kind: 'mana'; token: string }
  | { kind: 'text'; text: string; fontStyle: 'normal' | 'italic'; opacity?: number; emphasis?: boolean };

function normalizeRulesDisplayLine(line: RulesDisplayLine): WrappedRulesLine {
  if (typeof line === 'string') {
    return { text: line, gapBefore: 0 };
  }
  return { text: line.text, gapBefore: line.gapBefore ?? 0 };
}

function parseRuleLineParts(line: string, defaultFontStyle: 'normal' | 'italic', initialParentheticalDepth = 0): { parts: RuleLinePart[]; parentheticalDepth: number } {
  const parts: RuleLinePart[] = [];
  let parentheticalDepth = initialParentheticalDepth;
  for (let index = 0; index < line.length; ) {
    if (line[index] === '{') {
      const end = line.indexOf('}', index + 1);
      if (end !== -1) {
        const token = line.slice(index + 1, end).trim();
        if (token) {
          parts.push({ kind: 'mana', token });
        }
        index = end + 1;
        continue;
      }
    }
    if (parentheticalDepth > 0) {
      const closeIndex = line.indexOf(')', index);
      const manaIndex = line.indexOf('{', index);
      if (closeIndex >= 0 && (manaIndex < 0 || closeIndex < manaIndex)) {
        pushRuleTextPart(parts, line.slice(index, closeIndex + 1), 'italic');
        parentheticalDepth = Math.max(0, parentheticalDepth - 1);
        index = closeIndex + 1;
        continue;
      }
      const nextSpecial = nextParentheticalSyntaxIndex(line, index);
      if (nextSpecial > index) {
        pushRuleTextPart(parts, line.slice(index, nextSpecial), 'italic');
        index = nextSpecial;
        continue;
      }
      if (line[index] === ')') {
        pushRuleTextPart(parts, ')', 'italic');
        parentheticalDepth = Math.max(0, parentheticalDepth - 1);
        index += 1;
        continue;
      }
    }
    if (line.slice(index, index + 3).toLowerCase() === '<i>') {
      const end = line.toLowerCase().indexOf('</i>', index + 3);
      if (end !== -1) {
        pushRuleTextPart(parts, line.slice(index + 3, end), 'italic', undefined, true);
        index = end + 4;
        continue;
      }
    }
    if (line[index] === '(') {
      const closeIndex = line.indexOf(')', index + 1);
      const manaIndex = line.indexOf('{', index + 1);
      if (closeIndex >= 0 && (manaIndex < 0 || closeIndex < manaIndex)) {
        pushRuleTextPart(parts, line.slice(index, closeIndex + 1), 'italic');
        index = closeIndex + 1;
        continue;
      }
      const nextManaIndex = manaIndex >= 0 ? manaIndex : line.length;
      pushRuleTextPart(parts, line.slice(index, nextManaIndex), 'italic');
      parentheticalDepth += 1;
      index = nextManaIndex;
      continue;
    }
    if (defaultFontStyle === 'italic' && line[index] === '*') {
      const end = line.indexOf('*', index + 1);
      if (end !== -1) {
        pushRuleTextPart(parts, line.slice(index + 1, end), 'normal', 0.76);
        index = end + 1;
        continue;
      }
    }
    const nextSpecial = nextRuleSyntaxIndex(line, index + 1, defaultFontStyle);
    pushRuleTextPart(parts, line.slice(index, nextSpecial), defaultFontStyle);
    index = nextSpecial;
  }
  return { parts, parentheticalDepth };
}

function nextRuleSyntaxIndex(line: string, start: number, defaultFontStyle: 'normal' | 'italic'): number {
  const candidates = [line.indexOf('{', start), line.toLowerCase().indexOf('<i>', start), line.indexOf('(', start)];
  if (defaultFontStyle === 'italic') {
    candidates.push(line.indexOf('*', start));
  }
  const next = candidates.filter((value) => value >= 0).sort((a, b) => a - b)[0];
  return next ?? line.length;
}

function nextParentheticalSyntaxIndex(line: string, start: number): number {
  const candidates = [line.indexOf('{', start), line.indexOf(')', start)];
  const next = candidates.filter((value) => value >= 0).sort((a, b) => a - b)[0];
  return next ?? line.length;
}

function pushRuleTextPart(parts: RuleLinePart[], text: string, fontStyle: 'normal' | 'italic', opacity?: number, emphasis?: boolean): void {
  if (!text) {
    return;
  }
  parts.push({ kind: 'text', text, fontStyle, opacity, emphasis });
}

function displayRulesText(value: string | undefined, cardName: string): string {
  return String(value ?? '')
    .replace(/\\\\/g, '\n')
    .replace(/(^|[^A-Za-z0-9_])~(?=$|[^A-Za-z0-9_])/g, (_match, prefix: string) => `${prefix}${cardName}`);
}

function estimateTextWidth(value: string, fontSize: number): number {
  return value.length * fontSize * 0.51;
}

function estimateRuleTextWidth(value: string, fontSize: number, fontStyle: 'normal' | 'italic' = 'normal'): number {
  const text = stripRuleMarkup(value);
  let width = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') {
      const end = text.indexOf('}', index + 1);
      if (end !== -1) {
        width += fontSize * 1.18;
        index = end;
        continue;
      }
    }
    if (/\s/.test(char)) {
      width += fontSize * 0.24;
    } else if (/[ilI.,;:'`!|]/.test(char)) {
      width += fontSize * 0.24;
    } else if (/[mwMW@#%&]/.test(char)) {
      width += fontSize * 0.64;
    } else if (/[A-Z]/.test(char)) {
      width += fontSize * 0.51;
    } else {
      width += fontSize * 0.45;
    }
  }
  return width * (fontStyle === 'italic' ? 0.95 : 1.08);
}

function stripRuleMarkup(value: string): string {
  return value.replace(/<\/?i>/gi, '');
}

function isStandaloneKeywordLine(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return RULE_KEYWORDS.has(normalized);
}

const RULE_KEYWORDS = new Set([
  'deathtouch',
  'defender',
  'double strike',
  'first strike',
  'flash',
  'flying',
  'haste',
  'hexproof',
  'indestructible',
  'lifelink',
  'menace',
  'protection',
  'prowess',
  'reach',
  'trample',
  'vigilance',
  'ward'
]);

function FallbackFrame({
  width,
  height,
  title,
  mana,
  palette
}: {
  width: number;
  height: number;
  title: { x: number; y: number; w: number; h: number };
  mana: { x: number; y: number; w: number; h: number };
  palette: FramePalette;
}): React.ReactElement {
  return (
    <>
      <rect width={width} height={height} rx="28" fill="#17191d" />
      <rect x="22" y="22" width={width - 44} height={height - 44} rx="24" fill={palette.border} />
      <rect x="34" y="34" width={width - 68} height={height - 68} rx="18" fill="url(#cardBody)" />
      <rect x="46" y="46" width="9" height={height - 92} rx="4" fill={palette.accent} opacity="0.86" />
      <g filter="url(#softShadow)">
        <rect x={title.x} y={title.y} width={title.w + mana.w + 6} height={title.h} rx="14" fill="#fcfbf7" stroke="#15171b" strokeWidth="2.5" />
      </g>
    </>
  );
}

function PlaceholderArt({
  artZone,
  palette,
  artDataUri,
  transform,
  crop,
  framed = false,
  masked = false
}: {
  artZone: { x: number; y: number; w: number; h: number };
  palette: FramePalette;
  artDataUri?: string;
  transform?: { x: number; y: number; scale: number };
  crop?: { x: number; y: number; w: number; h: number };
  framed?: boolean;
  masked?: boolean;
}): React.ReactElement {
  const imageBox = artImageBox(artZone, transform, crop);
  if (framed) {
    const maskProps = masked ? { mask: 'url(#artImageMask)' } : { clipPath: 'url(#placeholderArtClip)' };
    return (
      <g {...maskProps}>
        {artDataUri ? (
          <image href={artDataUri} x={imageBox.x} y={imageBox.y} width={imageBox.w} height={imageBox.h} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <MissingArtFill artZone={artZone} palette={palette} />
        )}
      </g>
    );
  }

  return (
    <>
      <g filter="url(#softShadow)">
        <rect x={artZone.x - 7} y={artZone.y - 7} width={artZone.w + 14} height={artZone.h + 14} rx="14" fill="#15171b" />
        {artDataUri ? (
          <image href={artDataUri} x={imageBox.x} y={imageBox.y} width={imageBox.w} height={imageBox.h} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <MissingArtFill artZone={artZone} palette={palette} />
        )}
      </g>
    </>
  );
}

function artImageBox(
  artZone: { x: number; y: number; w: number; h: number },
  transform?: { x: number; y: number; scale: number },
  crop?: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  if (!crop || crop.w <= 0 || crop.h <= 0) {
    if (!transform) {
      return artZone;
    }
    const offsetX = clamp(transform.x, -200, 200);
    const offsetY = clamp(transform.y, -200, 200);
    const scale = clamp(transform.scale, 25, 400) / 100;
    const width = artZone.w * scale;
    const height = artZone.h * scale;
    return {
      x: artZone.x - (width - artZone.w) / 2 + artZone.w * (offsetX / 100),
      y: artZone.y - (height - artZone.h) / 2 + artZone.h * (offsetY / 100),
      w: width,
      h: height
    };
  }
  const cropW = clamp(crop.w, 1, 100);
  const cropH = clamp(crop.h, 1, 100);
  const scaleX = 100 / cropW;
  const scaleY = 100 / cropH;
  return {
    x: artZone.x - artZone.w * scaleX * (clamp(crop.x, 0, 100) / 100),
    y: artZone.y - artZone.h * scaleY * (clamp(crop.y, 0, 100) / 100),
    w: artZone.w * scaleX,
    h: artZone.h * scaleY
  };
}

function MissingArtFill({
  artZone,
  palette
}: {
  artZone: { x: number; y: number; w: number; h: number };
  palette: FramePalette;
}): React.ReactElement {
  return (
    <>
      <rect x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} fill="url(#artGradient)" />
      <rect x={artZone.x} y={artZone.y} width={artZone.w} height={artZone.h} fill={palette.accent} opacity="0.08" />
    </>
  );
}

function colorsFrom(colors?: string): string[] {
  return [...new Set((colors ?? '').replace(/[^WUBRGC]/g, '').split('').filter(Boolean))];
}

function preferredColorVariant(colors: string[]): string {
  if (colors.length > 1) {
    return 'M';
  }
  return colors[0] ?? 'C';
}

interface FramePalette {
  accent: string;
  border: string;
  bodyTop: string;
  bodyBottom: string;
  artTop: string;
  artMid: string;
  artBottom: string;
}

function colorToPalette(color: string): FramePalette {
  switch (color) {
    case 'W':
      return {
        accent: '#b89b36',
        border: '#d8c46f',
        bodyTop: '#f8f4df',
        bodyBottom: '#ece5c8',
        artTop: '#e5d995',
        artMid: '#d9e6df',
        artBottom: '#b8c6df'
      };
    case 'U':
      return {
        accent: '#327ca7',
        border: '#77b4d1',
        bodyTop: '#e8f3f7',
        bodyBottom: '#d4e5ec',
        artTop: '#9ad0df',
        artMid: '#c6d2ee',
        artBottom: '#e8d8ea'
      };
    case 'B':
      return {
        accent: '#5f5969',
        border: '#8b8295',
        bodyTop: '#eeeaf0',
        bodyBottom: '#d8d1dc',
        artTop: '#a89fb4',
        artMid: '#d3c4d0',
        artBottom: '#e7d7c3'
      };
    case 'R':
      return {
        accent: '#b55335',
        border: '#d8835d',
        bodyTop: '#f5e7df',
        bodyBottom: '#ead2c7',
        artTop: '#e6a56f',
        artMid: '#e7d9a2',
        artBottom: '#c8d5df'
      };
    case 'G':
      return {
        accent: '#4e8a62',
        border: '#83b889',
        bodyTop: '#e7f1e2',
        bodyBottom: '#d3e2cf',
        artTop: '#89c28a',
        artMid: '#c5dcc0',
        artBottom: '#d8d1ad'
      };
    case 'M':
      return {
        accent: '#b9852c',
        border: '#d7bc68',
        bodyTop: '#f4edcd',
        bodyBottom: '#e7d6a3',
        artTop: '#d7bc68',
        artMid: '#c7d9d1',
        artBottom: '#d8bd94'
      };
    default:
      return {
        accent: '#767d86',
        border: '#b0b5bc',
        bodyTop: '#eff1f2',
        bodyBottom: '#d9dcdf',
        artTop: '#b9c0c8',
        artMid: '#d9d1c5',
        artBottom: '#c7d6d8'
      };
  }
}

function fieldCoverFill(color: string): { header: string; text: string; footer: string } {
  switch (color) {
    case 'W':
      return { header: '#F2F1EF', text: '#F8F3EA', footer: '#E8DEC5' };
    case 'U':
      return { header: '#D8E9F2', text: '#EAF4F8', footer: '#D7E7EF' };
    case 'B':
      return { header: '#D9D6DA', text: '#ECE7EC', footer: '#D0CDD2' };
    case 'R':
      return { header: '#F0C6BB', text: '#FFEAE2', footer: '#EAC2B6' };
    case 'G':
      return { header: '#D9E8D2', text: '#EEF6E8', footer: '#CADFC5' };
    case 'M':
      return { header: '#EFE3BD', text: '#F8EED2', footer: '#E5D1A1' };
    default:
      return { header: '#DFDDD4', text: '#F1EFE9', footer: '#D7D4CA' };
  }
}

interface RulesLayout {
  oracleLines: WrappedRulesLine[];
  flavorLines: WrappedRulesLine[];
  fontSize: number;
  lineHeight: number;
  symbolSize: number;
  oracleY: number;
  separatorY?: number;
  flavorY: number;
  paddingLeft: number;
  paddingRight: number;
  fits: boolean;
}

interface RulesTextLayoutOptions {
  fontSize?: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
}

function layoutRulesText(
  oracleText: string | undefined,
  flavorText: string | undefined,
  typography: Typography,
  rulesHeight: number,
  rulesWidth: number,
  options: RulesTextLayoutOptions
): RulesLayout {
  const oracle = oracleText?.trim() ?? '';
  const flavor = flavorText?.trim() ?? '';
  const maxFont = typography.rules;
  const minFont = typography.compact ? 9.5 : 11.5;
  const topY = typography.rulesY + options.paddingTop;
  let selected = buildRulesTextAtFont(oracle, flavor, typography, rulesHeight, rulesWidth, minFont, topY, options);
  if (options.fontSize !== undefined) {
    selected = buildRulesTextAtFont(oracle, flavor, typography, rulesHeight, rulesWidth, options.fontSize, topY, options);
  } else {
    for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 0.25) {
      const candidate = buildRulesTextAtFont(oracle, flavor, typography, rulesHeight, rulesWidth, fontSize, topY, options);
      if (!candidate.fits) {
        continue;
      }
      selected = candidate;
      break;
    }
  }
  const { fontSize, lineHeight, symbolSize, oracleRaw, flavorRaw } = selected;
  const maxTextHeight = Math.max(lineHeight, rulesHeight - topY - options.paddingBottom - rulesTextBottomReserve(typography));

  if (oracleRaw.length > 0 && flavorRaw.length > 0) {
    let oracleLines = oracleRaw;
    let flavorLines = flavorRaw;
    if (!selected.fits) {
      const separatorReserve = Math.round(lineHeight * 1.08);
      const available = Math.max(lineHeight * 2, maxTextHeight - separatorReserve);
      const flavorBudget = Math.min(rulesLineBlockHeight(flavorRaw, lineHeight), Math.max(lineHeight, available * 0.22));
      flavorLines = takeRulesLinesForHeight(flavorRaw, lineHeight, flavorBudget);
      const oracleBudget = Math.max(lineHeight, available - rulesLineBlockHeight(flavorLines, lineHeight));
      oracleLines = takeRulesLinesForHeight(oracleRaw, lineHeight, oracleBudget);
    }
    const oracleHeight = rulesLineBlockHeight(oracleLines, lineHeight);
    const flavorHeight = rulesLineBlockHeight(flavorLines, lineHeight);
    const usedHeight = oracleHeight + flavorHeight + lineHeight * 1.02;
    const slack = Math.max(0, maxTextHeight - usedHeight);
    const separatorY = topY + oracleHeight + Math.round(Math.max(lineHeight * 0.32, slack * 0.28));
    return {
      oracleLines,
      flavorLines,
      fontSize,
      lineHeight,
      symbolSize,
      oracleY: topY,
      separatorY,
      flavorY: separatorY + Math.round(lineHeight * 0.95),
      paddingLeft: options.paddingLeft,
      paddingRight: options.paddingRight,
      fits: selected.fits
    };
  }

  const soloLines = oracleRaw.length > 0 ? takeRulesLinesForHeight(oracleRaw, lineHeight, maxTextHeight) : [];
  const soloFlavor = oracleRaw.length === 0 ? takeRulesLinesForHeight(flavorRaw, lineHeight, maxTextHeight) : [];
  const soloHeight = Math.max(rulesLineBlockHeight(soloLines, lineHeight), rulesLineBlockHeight(soloFlavor, lineHeight));
  const soloCount = Math.max(soloLines.length, soloFlavor.length);
  const soloY = soloCount <= 2 ? topY + Math.max(0, Math.round((rulesHeight - topY - options.paddingBottom - soloHeight) * 0.46)) : topY;
  return {
    oracleLines: soloLines,
    flavorLines: soloFlavor,
    fontSize,
    lineHeight,
    symbolSize,
    oracleY: soloY,
    flavorY: soloY,
    paddingLeft: options.paddingLeft,
    paddingRight: options.paddingRight,
    fits: selected.fits
  };
}

function buildRulesTextAtFont(
  oracle: string,
  flavor: string,
  typography: Typography,
  rulesHeight: number,
  rulesWidth: number,
  fontSize: number,
  topY: number,
  options: RulesTextLayoutOptions
): {
  fontSize: number;
  lineHeight: number;
  symbolSize: number;
  maxLines: number;
  oracleRaw: WrappedRulesLine[];
  flavorRaw: WrappedRulesLine[];
  fits: boolean;
} {
  const lineHeight = Math.round(fontSize * (typography.compact ? 1.12 : 1.24));
  const symbolSize = Math.round(fontSize * 1.02);
  const defaultWidth = Math.max(1, rulesWidth - typography.rulesX * 2);
  const availableWidth = Math.max(1, defaultWidth - options.paddingLeft - options.paddingRight);
  const maxLines = Math.max(2, Math.floor((rulesHeight - topY - options.paddingBottom - rulesTextBottomReserve(typography)) / lineHeight));
  const oracleRaw = oracle ? wrapRulesText(oracle, availableWidth, fontSize, typography.compact, 'normal') : [];
  const flavorRaw = flavor ? wrapRulesText(flavor, availableWidth, fontSize, typography.compact, 'italic') : [];
  const maxTextHeight = Math.max(lineHeight, rulesHeight - topY - options.paddingBottom - rulesTextBottomReserve(typography));
  const neededHeight =
    rulesLineBlockHeight(oracleRaw, lineHeight) +
    rulesLineBlockHeight(flavorRaw, lineHeight) +
    (oracleRaw.length && flavorRaw.length ? lineHeight * 1.02 : 0);
  return {
    fontSize,
    lineHeight,
    symbolSize,
    maxLines,
    oracleRaw,
    flavorRaw,
    fits: neededHeight <= maxTextHeight
  };
}

function wrapRulesText(value: string, maxWidth: number, fontSize: number, compact: boolean, fontStyle: 'normal' | 'italic' = 'normal'): WrappedRulesLine[] {
  const lines: WrappedRulesLine[] = [];
  let nextGap = 0;
  const paragraphGap = Math.round(fontSize * (compact ? 0.34 : 0.42));
  for (const paragraph of value.split(/\r?\n/)) {
    if (paragraph.trim() === '') {
      if (lines.length > 0) {
        nextGap = Math.max(nextGap, paragraphGap);
      }
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (estimateRuleTextWidth(next, fontSize, fontStyle) > maxWidth && line) {
        lines.push({ text: line, gapBefore: nextGap });
        nextGap = 0;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      lines.push({ text: line, gapBefore: nextGap });
      nextGap = 0;
    }
  }
  return lines;
}

function rulesLineBlockHeight(lines: WrappedRulesLine[], lineHeight: number): number {
  return lines.reduce((height, line) => height + line.gapBefore + lineHeight, 0);
}

function takeRulesLinesForHeight(lines: WrappedRulesLine[], lineHeight: number, maxHeight: number): WrappedRulesLine[] {
  const selected: WrappedRulesLine[] = [];
  let usedHeight = 0;
  for (const line of lines) {
    const nextHeight = usedHeight + line.gapBefore + lineHeight;
    if (nextHeight > maxHeight && selected.length > 0) {
      break;
    }
    if (nextHeight > maxHeight) {
      selected.push({ ...line, gapBefore: 0 });
      break;
    }
    selected.push(line);
    usedHeight = nextHeight;
  }
  return selected;
}

function rulesTextBottomReserve(typography: Typography): number {
  return typography.compact ? 3 : 7;
}

function rulesTextLayoutOptionsFromFace(face: CardFaceRecord, typography: Typography): RulesTextLayoutOptions {
  const defaultPaddingTop = defaultRulesTextPaddingTop(face, typography);
  return {
    fontSize: rulesTextFontSize(face.rulesTextSizeHint, typography),
    paddingTop: clamp(face.rulesTextPaddingTop ?? defaultPaddingTop, -18, 64),
    paddingRight: clamp(face.rulesTextPaddingRight ?? defaultRulesTextPaddingRight(face, typography), -24, 64),
    paddingBottom: clamp(face.rulesTextPaddingBottom ?? 0, -18, 64),
    paddingLeft: clamp(face.rulesTextPaddingLeft ?? defaultRulesTextPaddingLeft(face, typography), -24, 64)
  };
}

function defaultRulesTextPaddingTop(face: CardFaceRecord, typography: Typography): number {
  if (face.frameType === 'normal_land') {
    return typography.compact ? 32 : 46;
  }

  // Inline mana/tap symbols sit above the text baseline, so symbol-led text
  // needs extra clearance from the type line even when the text itself fits.
  if (face.frameType === 'normal_artifact' || startsWithInlineSymbol(face.oracleText)) {
    return typography.compact ? 24 : 34;
  }

  return 0;
}

function defaultRulesTextPaddingRight(face: CardFaceRecord, typography: Typography): number {
  if (!typography.compact || !face.frameType.startsWith('normal_')) {
    return 0;
  }
  return 24;
}

function defaultRulesTextPaddingLeft(face: CardFaceRecord, typography: Typography): number {
  if (!typography.compact || !face.frameType.startsWith('normal_')) {
    return 0;
  }
  return 5;
}

function startsWithInlineSymbol(value: string | undefined): boolean {
  const firstLine = String(value ?? '')
    .trimStart()
    .split(/\r?\n/, 1)[0]
    .trimStart();
  return /^\{[^}]+\}/.test(firstLine);
}

function rulesTextFontSize(value: string | undefined, typography: Typography): number | undefined {
  const cleaned = String(value ?? '').trim().toLowerCase();
  if (!cleaned || cleaned === 'auto') {
    return undefined;
  }
  if (cleaned === 'small') {
    return typography.compact ? 10.5 : 16;
  }
  if (cleaned === 'normal') {
    return typography.rules;
  }
  if (cleaned === 'large') {
    return typography.compact ? 17 : 28;
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return clamp(parsed, typography.compact ? 9 : 13, typography.compact ? 31 : 60);
}

function fitFontSize(value: string, maxSize: number, minSize: number, maxWidth: number): number {
  if (!value) {
    return maxSize;
  }
  const estimatedAtMax = estimateTextWidth(value, maxSize);
  if (estimatedAtMax <= maxWidth) {
    return maxSize;
  }
  return clamp((maxWidth / estimatedAtMax) * maxSize, minSize, maxSize);
}

function truncateForBox(value: string, maxCharacters: number): string {
  if (value.length <= maxCharacters) {
    return value;
  }
  return `${value.slice(0, Math.max(1, maxCharacters - 3))}...`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseManaCost(manaCost?: string): string[] {
  return parseManaCostTokens(manaCost).reverse();
}

function normalizeManaToken(token: string): string {
  return token.trim().toLowerCase();
}

function manaFill(token: string): string {
  switch (token) {
    case 'W':
      return '#f1e6b4';
    case 'U':
      return '#9bd0ed';
    case 'B':
      return '#c6bdca';
    case 'R':
      return '#e59a76';
    case 'G':
      return '#9bd39e';
    case 'C':
      return '#dadde1';
    default:
      return '#f4f1ea';
  }
}

function manaInk(token: string): string {
  return token === 'B' ? '#15171b' : '#111318';
}
