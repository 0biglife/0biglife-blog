"use client";

import {
  Box,
  Heading,
  Text,
  VStack,
  Divider,
  IconButton,
  HStack,
  Tooltip,
  useColorMode,
  SimpleGrid,
} from "@chakra-ui/react";
import { DownloadIcon } from "@chakra-ui/icons";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

const MotionIconButton = motion(IconButton);

export default function IntroductionClient() {
  const pdfRef = useRef<HTMLDivElement>(null);
  const { colorMode, setColorMode } = useColorMode();

  const controls = useAnimation();

  useEffect(() => {
    const timer = setTimeout(() => {
      controls.start({
        scale: [1, 1.15, 1],
        transition: {
          duration: 0.8,
          ease: "easeInOut",
        },
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [controls]);

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    const isDark = colorMode === "dark";
    if (isDark) setColorMode("light");
    await new Promise((r) => setTimeout(r, 100));
    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: 0.5,
        filename: "Frontend_Engineer_김민석_자기소개서.pdf",
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      })
      .from(pdfRef.current)
      .save();
    if (isDark) setColorMode("dark");
  };

  return (
    <Box px={{ base: 4, md: 12 }} py={10} maxW="4xl" mx="auto">
      <Tooltip
        label="PDF는 항상 라이트 테마로 저장됩니다. 잠시 화면이 깜빡일 수 있어요 😊"
        placement="left"
        bg="gray.600"
        color="white"
        _dark={{ bg: "gray.200", color: "gray.900" }}
        fontSize="sm"
        px={4}
        py={2}
        borderRadius="md"
        boxShadow="md"
        w="max-content"
        sx={{
          "--popper-arrow-bg": "gray.600",
          maxWidth: "none",
          width: "max-content",
        }}
      >
        <MotionIconButton
          animate={controls}
          pos="fixed"
          bottom={6}
          right={6}
          boxShadow="lg"
          zIndex={999}
          aria-label="PDF 다운로드"
          icon={<DownloadIcon />}
          bg="gray.300"
          variant="ghost"
          size="lg"
          borderRadius="full"
          _dark={{ bg: "gray.700" }}
          _hover={{
            bg: "gray.400",
            _dark: { bg: "gray.600" },
          }}
          onClick={handleDownloadPDF}
        />
      </Tooltip>

      <Box ref={pdfRef}>
        <HStack justify="space-between" mb={4}>
          <Heading as="h1" size="xl">
            Frontend Engineer 김민석
          </Heading>
        </HStack>

        <Divider my={6} />

        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="md" mb={2}>
              직무 강점 및 성공 경험
            </Heading>
            <Text fontSize="sm" lineHeight="tall">
              직무강점은{" "}
              <Box
                as="span"
                color="green.500"
                _dark={{ color: "green.400" }}
                fontWeight="bold"
              >
                프론트엔드 생애주기(코드 설계, 빌드, 배포) 경험{" "}
              </Box>
              과{" "}
              <Box
                as="span"
                color="green.500"
                _dark={{ color: "green.400" }}
                fontWeight="bold"
              >
                주도적인 문제 해결 및 협업 능력{" "}
              </Box>
              입니다.
              <br />
              2년 8개월간 모빌리티 스타트업, 원더무브에서 근무하여 다음과 같은
              강점을 가진 개발자로 성장하였습니다.
            </Text>

            <Text
              mt={8}
              fontSize="sm"
              fontWeight="bold"
              color="green.500"
              _dark={{ color: "green.400" }}
            >
              반복적인 도전 경험으로 설계부터 배포까지 고민하는 개발자
            </Text>
            <Text
              fontSize="sm"
              mt={1}
              lineHeight="tall"
              sx={{ textIndent: "0.5em" }}
            >
              클라우드 관리 솔루션(Skuber)의 프론트엔드 아키텍처와 컴포넌트
              구조를 설계하며, 전체 화면과 기능의 80% 이상 개발하는 데
              기여했습니다. 코드의 가독성과 안정성을 높이기 위해 Typescript를
              도입하고, Javascript의 메모리 구조 및 브라우저 동작 방식(Reflow,
              Repaint 등)을 고려하며 코드를 설계하였으며, 유지보수와 재사용성을
              고려하여 Storybook 기반의 컴포넌트 계층 구조를 설계하였습니다.
              상태 관리는 커스텀 훅과 Redux를 병행하여 구성하고, Axios 인스턴스
              기반의 API 통신 모듈과 웹소켓을 활용해 실시간 처리 기능도
              개발했습니다. 기존에 수동으로 Azure 컨테이너 레지스트리에 이미지를
              푸시하던 방식을 Makefile과 Github Actions 기반 빌드 배포 자동화를
              구축하여 개발 생산성은 높이고 반복된 작업 비용을 줄였습니다. 또한,
              솔루션 설치 툴 개발 과정에서는 Kubernetes 리소스를 통합 관리하고
              배포할 수 있도록 Helm Chart를 설계하여 설치 과정의 일관성과
              효율성을 개선시켰습니다.
            </Text>

            <Text
              mt={8}
              fontSize="sm"
              fontWeight="bold"
              color="green.500"
              _dark={{ color: "green.400" }}
            >
              UX부터 성능까지 서비스 품질을 주도적으로 개선하는 개발자
            </Text>
            <Text fontSize="sm" mt={1} lineHeight="tall">
              <Box
                as="span"
                display="block"
                sx={{ textIndent: "0.5em", textAlign: "justify" }}
              >
                모니터링 대시보드의 성능 저하 이슈 발생 시 크롬 개발자 도구를
                활용해 병목 구간을 진단하고, 메모이제이션, 클린업 작성, 리렌더링
                최소화 등 브라우저 자원 소비를 적극 개선하였습니다. API 통신
                모듈을 WebSocket 기반 구조로 전환을 제안하였고 모니터링 과정에서
                불필요한 필드가 과도하게 포함된 응답 구조를 백엔드 팀과의
                협의하여 개선함으로써 데이터 전송량을 약 20% 줄였으며,
                결과적으로 장시간 사용에도 안정적인 성능을 확보하였습니다.
              </Box>
              <Box
                as="span"
                display="block"
                mt={2}
                sx={{ textIndent: "0.5em", textAlign: "justify" }}
              >
                프론트엔드 개발자는 기획자, 디자이너, 백엔드 모두와 맞닿아 있는
                포지션인 만큼, 개발 역량뿐만 아니라 원활한 소통과 협업 방식도
                매우 중요하다고 체감해왔습니다. 특히, 기획·디자인 팀과의 협업을
                진행해오면서, 명확한 근거에 기반한 프로세스를 구축하고
                개선하였습니다. 불필요한 페이지가 한 뎁스(depth)씩 늘어날 때마다
                사용자 경험이 저하된다는 통계를 바탕으로 현재 프로세스를
                분석하고, 대시보드에서 모니터링 기능과 리스트 조회 기능을
                바텀시트로 통합하도록 제안 및 구현하였습니다. 요청 시간이 긴
                인프라 작업에 대해서는 사용자에게 즉각적인 피드백을 제공할 수
                있도록 토스트 팝업 기능을 설계하였습니다. 이 외에도 주어진
                업무에 대해 팀원 및 리더와의 업무 공유와 적극적인 피드백 요청을
                통해 업무 방향을 소통하고, 문제 상황에서도 함께 해결책을
                도출해내는 협업 문화를 실천해왔습니다.
              </Box>
              <br />
            </Text>
          </Box>

          <Box>
            <Heading size="md" mb={4}>
              직무를 위한 준비
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
              <Box>
                <Text
                  mb={1}
                  fontSize="sm"
                  color="green.500"
                  fontWeight="semibold"
                  _dark={{ color: "green.400" }}
                >
                  커리어 빈틈을 채워주는 기술 블로그 운영
                </Text>
                <Text
                  fontSize="sm"
                  lineHeight="tall"
                  sx={{ textIndent: "0.5em" }}
                >
                  취업 준비 시절 때부터 2년간 티스토리 플랫폼을 활용하여 기술
                  블로그를 운영하였습니다. 올해 1월에 블로그 UI 커스터마이징과
                  기능 확장성을 위하여 Next.js로 기술 블로그를 만들어 AWS 서버에
                  배포하고 있습니다. AWS Amplify를 통해 환경 변수 관리와 배포
                  자동화를 하고 있으며, S3를 통하여 블로그 내부 리소스를
                  관리하고 있습니다. 따라서, 단순히 .md 파일을 추가하는 것만으로
                  게시글 추가가 가능하도록 설계하여 편리하게 포스팅을 하고
                  있습니다. 이 블로그의 취지는 직접 공부한 내용과 부딪힌 문제에
                  대한 고민 해결과정에 대해 적는 것을 목적으로 하며, 업무 외
                  시간을 활용하여 정리하고 업무와 연관된 내용은 실무에 직접
                  적용해보고 있습니다.
                </Text>
              </Box>

              <Box>
                <Text
                  mb={1}
                  fontSize="sm"
                  color="green.500"
                  fontWeight="semibold"
                  _dark={{ color: "green.400" }}
                >
                  기술 트렌드 공유를 위한 주말 스터디 진행
                </Text>
                <Text
                  fontSize="sm"
                  lineHeight="tall"
                  sx={{ textIndent: "0.5em" }}
                >
                  7개월 동안 매주 일요일 강남역 공유 오피스를 대여하여 두 명의
                  팀원과 스터디를 진행하며 화장품 판매 서비스를 개발했습니다.
                  비록 프로젝트는 성공적으로 마치지 못했지만, 회사 외부 인원과의
                  네트워킹을 통해 프론트엔드를 포함한 다양한 기술 인사이트를
                  얻을 수 있었습니다. 스터디 시작 전, 해당 주에 공부한 내용을
                  영어로 간략히 발표하며 지식을 공유했고, 구현한 코드는 코드
                  리뷰를 통해 개선점을 논의했습니다. 리서치 과정을 통해 AWS
                  Amplify, 스토리북 배포를 위한 Chromatic 등 다양한 기술을
                  찾아보았으며, 회사 프로젝트 개선에 도움될만한 기술을
                  적용했습니다. 문제점을 발견하고 풀어내는 과정이 회사 프로젝트
                  생산성에도 도움이 되는 것을 경험하면서 큰 보람을 느꼈습니다.
                </Text>
              </Box>
            </SimpleGrid>
          </Box>

          <Box>
            <Heading size="md" mb={2} color="white">
              지원동기 및 포부
            </Heading>
            <Text
              mb={1}
              fontSize="sm"
              fontWeight="bold"
              color="green.500"
              _dark={{ color: "green.400" }}
            >
              균형 있는 하드 스킬과 소프트 스킬로 팀 성장에 기여하는 개발자
            </Text>
            <Text
              mb={1}
              fontSize="sm"
              lineHeight="tall"
              sx={{ textIndent: "0.5em" }}
            >
              관심과 노력을 들여 만든 결과물이 누군가를 움직이는 것은 큰 가치를
              가집니다. 그렇기 때문에 UX 개선이나 성능 최적화처럼 “더 나아지게
              만드는 일”에 깊은 관심을 가지고 있습니다. 개발은 물론이고 일을
              잘해내는 것에 관심은 많아 효율적인 협업과 소통을 고밉합니다.
              좋아하는 일을 잘하는 일로 만드는 과정과 결과 모두에 가치를 느끼며
              제가 속한 조직에 긍정적인 시너지를 만들고 싶은 욕구가 강하며,
              완벽한 팀원이 되기보다는 점진적으로 성장하여 개발 역량과 협업
              능력을 균형있게 갖춘 팀원으로서 기여하고자 합니다.
            </Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
}
