import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Právnická wiki',
  tagline: 'Otevřený zdroj informací pro studující Právnické fakulty UK.',
  favicon: 'img/logo.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: 'https://pravnicka.wiki',
  baseUrl: '/',

  organizationName: 'martinekadam', 
  projectName: 'pravnicka_wiki', 
  trailingSlash: false, 

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'cs',
    locales: ['cs'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/martinekadam/pravnicka_wiki/tree/main/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/martinekadam/pravnicka_wiki/tree/main',
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/pravnicka-wiki-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Právnická wiki',
      logo: {
        alt: 'Právnická wiki logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Wiki',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/martinekadam/pravnicka_wiki',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://instagram.com/pravnicka.wiki',
          label: 'Instagram',
          position: 'right',
        },
      ],
    },
    footer: {
      copyright: `Právnická wiki © ${new Date().getFullYear()}. Šířeno pod licencí <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.cs" target="_blank" rel="noopener noreferrer" style="color: var(--ifm-footer-link-color); text-decoration: underline;">CC BY-NC-SA 4.0</a>. Built with Docusaurus 🦖`, 
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
