import { describe, it, expect } from 'vitest';
import { inferPropsFromInstances } from './prop-inference';
import { generateReactComponent } from './react-gen';
import { generateHtmlAndCss } from './html-css';
import { generateTailwindJsx } from './tailwind-gen';
import { generateVueComponent } from './vue-gen';
import { normalizeClassName } from '../../content/similar-patterns';
import { ExtractedElement } from '../types';

describe('codegen & pattern tests', () => {
  it('normalizes CSS modules and CSS-in-JS class names', () => {
    expect(normalizeClassName('card__title___3z_1a')).toBe('card__title');
    expect(normalizeClassName('css-175oi2r')).toBe('');
    expect(normalizeClassName('sc-bdVaJa')).toBe('');
    expect(normalizeClassName('standard-btn')).toBe('standard-btn');
  });

  it('infers dynamic props across repeated element instances', () => {
    const card1: ExtractedElement = {
      id: '',
      tagName: 'div',
      classList: ['card', 'p-4'],
      attributes: {},
      rect: { top: 0, left: 0, width: 200, height: 150 },
      matchedRules: [],
      pseudoRules: [],
      inlineStyles: {},
      isTailwind: true,
      tailwindClasses: ['p-4'],
      customClasses: ['card'],
      textContent: 'Title 1',
      outerHTML: '<div class="card p-4">Title 1</div>',
      children: [],
      depth: 0,
      domPath: 'div.card',
      assets: [],
    };

    const card2: ExtractedElement = {
      ...card1,
      textContent: 'Title 2',
      outerHTML: '<div class="card p-4">Title 2</div>',
    };

    const props = inferPropsFromInstances([card1, card2]);
    expect(props.length).toBe(1);
    expect(props[0].sampleValues).toEqual(['Title 1', 'Title 2']);
  });

  it('generates clean React TSX with typed interface and sample data', () => {
    const rootEl: ExtractedElement = {
      id: 'header',
      tagName: 'header',
      classList: ['flex', 'items-center', 'p-6'],
      attributes: {},
      rect: { top: 0, left: 0, width: 800, height: 80 },
      matchedRules: [],
      pseudoRules: [],
      inlineStyles: {},
      isTailwind: true,
      tailwindClasses: ['flex', 'items-center', 'p-6'],
      customClasses: [],
      textContent: 'Elementa Header',
      outerHTML: '<header id="header" class="flex items-center p-6">Elementa Header</header>',
      children: [],
      depth: 0,
      domPath: 'header#header',
      assets: [],
    };

    const result = generateReactComponent(rootEl, [], 'AppHeader');
    expect(result.code).toContain('export const AppHeader: React.FC = () => {');
    expect(result.code).toContain('className="flex items-center p-6"');
  });

  it('generates scoped HTML and CSS', () => {
    const rootEl: ExtractedElement = {
      id: '',
      tagName: 'button',
      classList: ['cta-btn'],
      attributes: { type: 'button' },
      rect: { top: 0, left: 0, width: 120, height: 40 },
      matchedRules: [
        {
          selector: '.cta-btn',
          properties: [
            { property: 'background-color', value: '#6366f1', important: false },
            { property: 'color', value: '#ffffff', important: false },
          ],
          specificity: 10,
        },
      ],
      pseudoRules: [
        {
          pseudo: ':hover',
          selector: '.cta-btn:hover',
          properties: [{ property: 'background-color', value: '#4f46e5', important: false }],
        },
      ],
      inlineStyles: {},
      isTailwind: false,
      tailwindClasses: [],
      customClasses: ['cta-btn'],
      textContent: 'Get Started',
      outerHTML: '<button class="cta-btn" type="button">Get Started</button>',
      children: [],
      depth: 0,
      domPath: 'button.cta-btn',
      assets: [],
    };

    const result = generateHtmlAndCss(rootEl, 'elementa-comp');
    expect(result.css).toContain('.elementa-comp-');
    expect(result.css).toContain('background-color: #6366f1;');
    expect(result.css).toContain(':hover');
    expect(result.html).toContain('class="elementa-comp-');
    expect(result.html).toContain('cta-btn');
  });

  it('generates clean Tailwind JSX component', () => {
    const rootEl: ExtractedElement = {
      id: '',
      tagName: 'div',
      classList: ['bg-slate-900', 'text-white', 'rounded-xl', 'p-6'],
      attributes: {},
      rect: { top: 0, left: 0, width: 300, height: 200 },
      matchedRules: [],
      pseudoRules: [],
      inlineStyles: {},
      isTailwind: true,
      tailwindClasses: ['bg-slate-900', 'text-white', 'rounded-xl', 'p-6'],
      customClasses: [],
      textContent: 'Card Content',
      outerHTML: '<div class="bg-slate-900 text-white rounded-xl p-6">Card Content</div>',
      children: [],
      depth: 0,
      domPath: 'div',
      assets: [],
    };

    const result = generateTailwindJsx(rootEl, 'DarkCard');
    expect(result.code).toContain('export const DarkCard: React.FC = () => {');
    expect(result.code).toContain('className="bg-slate-900 text-white rounded-xl p-6"');
  });

  it('generates clean Vue 3 SFC component', () => {
    const rootEl: ExtractedElement = {
      id: '',
      tagName: 'div',
      classList: ['product-card'],
      attributes: {},
      rect: { top: 0, left: 0, width: 250, height: 180 },
      matchedRules: [],
      pseudoRules: [],
      inlineStyles: {},
      isTailwind: false,
      tailwindClasses: [],
      customClasses: ['product-card'],
      textContent: 'Vue Card',
      outerHTML: '<div class="product-card">Vue Card</div>',
      children: [],
      depth: 0,
      domPath: 'div.product-card',
      assets: [],
    };

    const result = generateVueComponent(rootEl, [], 'ProductCard', '.product-card { padding: 16px; }');
    expect(result.code).toContain('<script setup lang="ts">');
    expect(result.code).toContain('<template>');
    expect(result.code).toContain('<style scoped>');
  });
});
