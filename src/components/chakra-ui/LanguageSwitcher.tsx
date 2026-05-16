"use client";
import { useEffect, useState } from "react";
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { MdLanguage, MdCheck } from "react-icons/md";
import { useLanguage } from "@/i18n/LanguageProvider";
import { LANGS } from "@/i18n/dictionary";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // localStorage 기반이라 SSR/CSR 미스매치 방지를 위해 mount 후 렌더 (ThemeToggle과 동일 패턴)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Menu placement="bottom-end" autoSelect={false} isLazy>
      <MenuButton
        as={IconButton}
        aria-label="Change language"
        variant="ghost"
        style={{ borderRadius: "20px" }}
        icon={<MdLanguage size={20} />}
        _hover={{ bg: "gray.200", _dark: { bg: "gray.700" } }}
        _active={{ transform: "scale(0.9)" }}
      />
      <MenuList minW="148px" py={1}>
        {LANGS.map(({ code, label }) => (
          <MenuItem
            key={code}
            onClick={() => setLang(code)}
            fontSize="14px"
            fontWeight={lang === code ? "semibold" : "normal"}
            icon={
              <MdCheck size={16} style={{ opacity: lang === code ? 1 : 0 }} />
            }
          >
            {label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
