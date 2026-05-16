"use client";

import { useCallback } from "react";
import { Button, Wrap, WrapItem, useToast } from "@chakra-ui/react";
import { FiDownload, FiGithub, FiShare2 } from "react-icons/fi";
import { useLanguage } from "@/i18n/LanguageProvider";

type WorkActionsProps = {
  zipPath: string; // e.g. /works/<slug>/<slug>.zip
  github?: string; // optional GitHub repo URL
  shareUrl: string; // absolute URL of this work's detail page
  title: string; // work title, used in share payload
};

export default function WorkActions({ zipPath, github, shareUrl, title }: WorkActionsProps) {
  const toast = useToast();
  const { t } = useLanguage();

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: t("workActions.shareCopied"),
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch {
      toast({
        title: t("workActions.shareFailed"),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [shareUrl, toast, t]);

  const handleShare = useCallback(async () => {
    // Web Share API 는 SSR 시 undefined 이므로 클릭 시점에 feature-detect
    const canShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function";

    if (canShare) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch (error) {
        // 사용자가 공유 시트를 취소하면 AbortError 로 reject — 조용히 무시
        // 구형 Safari/WebKit 은 DOMException 이 아닌 plain Error 로 reject 하므로 이름만으로 판별
        if (error && (error as { name?: string }).name === "AbortError") {
          return;
        }
        // 그 외 공유 실패 시 클립보드로 폴백
        await copyToClipboard();
      }
      return;
    }

    await copyToClipboard();
  }, [shareUrl, title, copyToClipboard]);

  return (
    <Wrap spacing={3} role="group" aria-label={`${title} 작업 메뉴`}>
      <WrapItem>
        <Button
          as="a"
          href={zipPath}
          download
          leftIcon={<FiDownload />}
          colorScheme="blue"
          variant="solid"
        >
          {t("workActions.download")}
        </Button>
      </WrapItem>

      {github && github.trim() !== "" && (
        <WrapItem>
          <Button
            as="a"
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            leftIcon={<FiGithub />}
            variant="outline"
          >
            GitHub
          </Button>
        </WrapItem>
      )}

      <WrapItem>
        <Button leftIcon={<FiShare2 />} variant="outline" onClick={handleShare}>
          {t("workActions.share")}
        </Button>
      </WrapItem>
    </Wrap>
  );
}
