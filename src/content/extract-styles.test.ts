import { describe, it, expect } from 'vitest';
import {
  calculateSpecificity,
  isTailwindClass,
  classifyClasses,
  parsePseudoSelector,
  resolveCascadeProperties,
} from './extract-styles';
import { StyleRule } from '../shared/types';

describe('extract-styles unit tests', () => {
  it('calculates CSS specificity correctly', () => {
    expect(calculateSpecificity('#main')).toBe(100);
    expect(calculateSpecificity('.btn')).toBe(10);
    expect(calculateSpecificity('div')).toBe(1);
    expect(calculateSpecificity('#main .btn > a:hover')).toBe(100 + 10 + 10 + 1); // #main (.btn, :hover) (a) = 121
    expect(calculateSpecificity('nav ul li a::before')).toBe(4 + 1); // 4 tags + 1 pseudo-element = 5
  });

  it('identifies Tailwind utility classes accurately', () => {
    expect(isTailwindClass('flex')).toBe(true);
    expect(isTailwindClass('p-4')).toBe(true);
    expect(isTailwindClass('px-2.5')).toBe(true);
    expect(isTailwindClass('bg-[#1da1f2]')).toBe(true);
    expect(isTailwindClass('hover:bg-blue-600')).toBe(true);
    expect(isTailwindClass('dark:text-white')).toBe(true);
    expect(isTailwindClass('grid-cols-3')).toBe(true);
    expect(isTailwindClass('rounded-2xl')).toBe(true);

    // Non-Tailwind custom classes
    expect(isTailwindClass('product-card')).toBe(false);
    expect(isTailwindClass('hero-banner-title')).toBe(false);
    expect(isTailwindClass('custom-sidebar_v2')).toBe(false);
  });

  it('classifies element class lists as Tailwind or Custom', () => {
    const mixed = ['flex', 'items-center', 'justify-between', 'p-4', 'user-card'];
    const result = classifyClasses(mixed);
    expect(result.isTailwindElement).toBe(true);
    expect(result.tailwindClasses).toEqual(['flex', 'items-center', 'justify-between', 'p-4']);
    expect(result.customClasses).toEqual(['user-card']);
  });

  it('parses pseudo selectors properly', () => {
    expect(parsePseudoSelector('.card:hover')).toEqual({
      baseSelector: '.card',
      pseudo: ':hover',
    });
    expect(parsePseudoSelector('.button::after')).toEqual({
      baseSelector: '.button',
      pseudo: '::after',
    });
    expect(parsePseudoSelector('header')).toEqual({
      baseSelector: 'header',
      pseudo: null,
    });
  });

  it('resolves CSS cascade and specificity correctly', () => {
    const rules: StyleRule[] = [
      {
        selector: 'div',
        properties: [
          { property: 'color', value: 'red', important: false },
          { property: 'font-size', value: '14px', important: false },
        ],
        specificity: 1,
      },
      {
        selector: '.card',
        properties: [
          { property: 'color', value: 'blue', important: false }, // Higher specificity wins
        ],
        specificity: 10,
      },
      {
        selector: 'div.special',
        properties: [
          { property: 'color', value: 'green', important: false }, // 11 > 10, green wins over blue
        ],
        specificity: 11,
      },
      {
        selector: 'body div',
        properties: [
          { property: 'font-size', value: '12px', important: true }, // !important beats higher specificity
        ],
        specificity: 2,
      },
    ];

    const inlineStyles = { 'line-height': '1.5' };
    const resolved = resolveCascadeProperties(rules, inlineStyles);

    expect(resolved.get('color')?.value).toBe('green');
    expect(resolved.get('font-size')?.value).toBe('12px');
    expect(resolved.get('font-size')?.important).toBe(true);
    expect(resolved.get('line-height')?.value).toBe('1.5');
  });
});
