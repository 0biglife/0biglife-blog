"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex, HStack, IconButton, Text, useColorModeValue } from "@chakra-ui/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as DarkCodeStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaRegCopy } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";
import type { WorkFile } from "@/lib/types";

type CodePanelProps = {
  files: WorkFile[];
};

export default function CodePanel({ files }: CodePanelProps) {
  // 기본 선택 파일: index.html 이 있으면 그것, 없으면 첫 파일
  const defaultPath = useMemo<string>(() => {
    if (files.length === 0) return "";
    const indexFile = files.find((f) => f.path === "index.html");
    return (indexFile ?? files[0]).path;
  }, [files]);

  const [selectedPath, setSelectedPath] = useState<string>(defaultPath);
  const [copied, setCopied] = useState<boolean>(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // files prop 이 교체되어 현재 선택 경로가 사라지면 기본값으로 복구
  // (정상적인 사용자 선택은 files 안에 존재하므로 건드리지 않음)
  useEffect(() => {
    if (files.length === 0) return;
    if (!files.some((f) => f.path === selectedPath)) {
      setSelectedPath(defaultPath);
    }
  }, [files, selectedPath, defaultPath]);

  // 언마운트 시 복사 타이머 정리
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // 항상 hook 호출 순서를 지키기 위해 placeholder 색상은 위에서 계산
  const placeholderColor = useColorModeValue("gray.500", "gray.400");
  const containerBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const listBg = useColorModeValue("gray.50", "gray.800");
  const itemColor = useColorModeValue("gray.700", "gray.300");
  const itemHoverBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const activeBg = useColorModeValue("blue.500", "blue.400");
  const activeColor = "white";
  const codeBg = "#282c34"; // oneDark 배경과 일치
  const copyBtnBg = useColorModeValue("whiteAlpha.300", "whiteAlpha.200");

  const selectedFile = useMemo<WorkFile | undefined>(
    () => files.find((f) => f.path === selectedPath) ?? files[0],
    [files, selectedPath],
  );

  if (files.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        minH="160px"
        borderWidth="1px"
        borderColor={containerBorder}
        borderRadius="lg"
        bg={listBg}
      >
        <Text color={placeholderColor} fontSize="sm">
          코드 준비 중
        </Text>
      </Flex>
    );
  }

  const handleCopy = async () => {
    if (!selectedFile) return;
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code: ", error);
    }
  };

  return (
    <Flex
      flexDirection={{ base: "column", md: "row" }}
      borderWidth="1px"
      borderColor={containerBorder}
      borderRadius="lg"
      overflow="hidden"
    >
      {/* 파일 목록 — 데스크탑: 세로 / 모바일: 가로 스크롤 탭 */}
      <Flex
        flexDirection={{ base: "row", md: "column" }}
        bg={listBg}
        flexShrink={0}
        width={{ base: "100%", md: "220px" }}
        maxH={{ base: "auto", md: "440px" }}
        overflowX={{ base: "auto", md: "hidden" }}
        overflowY={{ base: "hidden", md: "auto" }}
        borderBottomWidth={{ base: "1px", md: 0 }}
        borderRightWidth={{ base: 0, md: "1px" }}
        borderColor={containerBorder}
        p={2}
        gap={1}
      >
        {files.map((file) => {
          const isActive = file.path === selectedFile?.path;
          return (
            <Box
              key={file.path}
              as="button"
              type="button"
              onClick={() => setSelectedPath(file.path)}
              aria-current={isActive ? "true" : undefined}
              flexShrink={0}
              textAlign="left"
              whiteSpace="nowrap"
              minH="40px"
              px={3}
              py={2}
              borderRadius="md"
              fontSize="sm"
              fontFamily="mono"
              fontWeight={isActive ? "semibold" : "normal"}
              bg={isActive ? activeBg : "transparent"}
              color={isActive ? activeColor : itemColor}
              _hover={{ bg: isActive ? activeBg : itemHoverBg }}
              _focusVisible={{
                outline: "2px solid",
                outlineColor: "blue.400",
                outlineOffset: "2px",
              }}
              transition="background 0.15s ease"
            >
              {file.path}
            </Box>
          );
        })}
      </Flex>

      {/* 코드 영역 */}
      <Box position="relative" flex="1" minW={0} bg={codeBg}>
        <HStack position="absolute" top={2} right={2} zIndex={2} spacing={2}>
          <IconButton
            aria-label={copied ? "코드 복사됨" : "코드 복사"}
            icon={
              copied ? (
                <FaCheck size={16} color="white" />
              ) : (
                <FaRegCopy size={16} color="white" />
              )
            }
            onClick={handleCopy}
            boxSize="44px"
            minW="44px"
            bg={copyBtnBg}
            color="white"
            _hover={{ bg: "whiteAlpha.400" }}
            _active={{ bg: "whiteAlpha.500" }}
            borderRadius="md"
          />
        </HStack>

        {selectedFile && (
          <SyntaxHighlighter
            language={selectedFile.lang}
            style={DarkCodeStyle}
            showLineNumbers
            customStyle={{
              margin: 0,
              padding: "1rem",
              paddingTop: "3.25rem",
              fontSize: "13px",
              borderRadius: 0,
              background: codeBg,
              overflowX: "auto",
              maxHeight: "440px",
            }}
          >
            {selectedFile.content}
          </SyntaxHighlighter>
        )}
      </Box>
    </Flex>
  );
}
