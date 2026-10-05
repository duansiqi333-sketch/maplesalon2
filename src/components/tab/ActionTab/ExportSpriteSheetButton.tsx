import { createSignal, Show } from 'solid-js';

import { $forceExportEffect } from '@/store/toolTab';
import { $globalRenderer } from '@/store/renderer';

import { useActionTab } from './ActionTabContext';
import { useTranslate } from '@/context/i18n';

import LayoutGrid from 'lucide-solid/icons/layout-grid';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionCharacterRef } from './ActionCharacter';
import { SpinLoading } from '@/components/elements/SpinLoading';

import type { Character } from '@/renderer/character/character';
import type { UniversalFrame } from '@/renderer/makeCanvasFrame';

import { toaster } from '@/components/GlobalToast';
import { batchExportCharacterFrames } from './batchExportCharacterFrames';
import {
  buildSpriteSheet,
  getSpecialAnchor,
  type SpriteSheetFrame,
} from './spriteSheet';
import { downloadBlob } from '@/utils/download';
import { nextTick } from '@/utils/eventLoop';

function getActionName(character: Character): string {
  return character.instruction || character.action;
}

export interface ExportSpriteSheetButtonProps {
  characterRefs: ActionCharacterRef[];
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  isIcon?: boolean;
}
export const ExportSpriteSheetButton = (props: ExportSpriteSheetButtonProps) => {
  const t = useTranslate();
  const [state, { startExport, finishExport }] = useActionTab();
  const [isExporting, setIsExporting] = createSignal(false);

  function tooManyImageWarning() {
    if (!$forceExportEffect.get()) {
      return;
    }
    toaster.create({
      title: t('export.exporting'),
      description: t('export.effectExportDesc'),
    });
  }

  async function handleClick() {
    if (isExporting() || state.isExporting) {
      return;
    }
    const isAllLoaded =
      props.characterRefs.every(
        (characterRef) => !characterRef.character.isLoading,
      ) && props.characterRefs.length !== 0;
    if (!isAllLoaded) {
      toaster.error({
        title: t('export.actionNotLoaded'),
      });
      return;
    }
    startExport();
    setIsExporting(true);
    await nextTick();

    if (props.characterRefs.length > 5) {
      tooManyImageWarning();
    }

    try {
      const exportCharacterData = await batchExportCharacterFrames(
        props.characterRefs.map((ref) => ref.character),
        $globalRenderer.get().renderer,
        {
          padWhiteSpace: true,
          simple: !$forceExportEffect.get(),
        },
      );
      const framesByAction = new Map<string, SpriteSheetFrame[]>();
      for (const [character, data] of exportCharacterData) {
        // 圖層部件模式（frames[0] 為陣列）不參與拼圖
        if (Array.isArray(data.frames[0])) {
          continue;
        }
        framesByAction.set(
          getActionName(character),
          data.frames as UniversalFrame[],
        );
      }
      // 小冊子定位公式需要的 body 錨點（取第一個角色；單角色匯出時即為該角色）
      const firstCharacter = props.characterRefs[0]?.character;
      const specialAnchor = firstCharacter
        ? getSpecialAnchor(firstCharacter)
        : { x: 0, y: 0 };
      const { canvas, missing } = buildSpriteSheet(
        framesByAction,
        undefined,
        specialAnchor,
      );
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) {
        toaster.error({
          title: t('export.errorBlob'),
        });
        return;
      }
      const firstCharacter = exportCharacterData[0]?.[0];
      const namePrefix = firstCharacter?.name ? `${firstCharacter.name}-` : '';
      downloadBlob(blob, `${namePrefix}spritesheet-2750x3500.png`);
      toaster.success({
        title: t('export.success'),
        description:
          missing > 0
            ? `${t('export.spriteSheetExported')} (${t('export.spriteSheetMissing')}: ${missing})`
            : t('export.spriteSheetExported'),
      });
    } catch (_) {
      toaster.error({
        title: t('export.error'),
      });
    } finally {
      setIsExporting(false);
      finishExport();
    }
  }

  return (
    <Button
      size={props.size}
      variant={props.variant}
      onClick={handleClick}
      disabled={isExporting() || state.isExporting}
      title={t('export.spriteSheet')}
    >
      <Show when={props.isIcon} fallback={t('export.spriteSheet')}>
        <LayoutGrid />
      </Show>
      <Show when={isExporting()}>
        <SpinLoading size={16} />
      </Show>
    </Button>
  );
};
