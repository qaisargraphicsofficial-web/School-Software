import React, { useState } from 'react';
import { ChevronDown, Type, Sigma, Variable, Parentheses, Square, Calculator, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface MathToolbarProps {
  onInsert: (value: string) => void;
  language: 'English' | 'Urdu';
}

const symbols = [
  { label: '±', latex: '\\pm' },
  { label: '∞', latex: '\\infty' },
  { label: '=', latex: '=' },
  { label: '≠', latex: '\\neq' },
  { label: '≈', latex: '\\approx' },
  { label: '×', latex: '\\times' },
  { label: '÷', latex: '\\div' },
  { label: '≤', latex: '\\leq' },
  { label: '≥', latex: '\\geq' },
  { label: '≪', latex: '\\ll' },
  { label: '≫', latex: '\\gg' },
  { label: '∝', latex: '\\propto' },
  { label: '∀', latex: '\\forall' },
  { label: '∃', latex: '\\exists' },
  { label: '∈', latex: '\\in' },
  { label: '∉', latex: '\\notin' },
  { label: '∏', latex: '\\prod' },
  { label: '∑', latex: '\\sum' },
  { label: '∆', latex: '\\Delta' },
  { label: 'π', latex: '\\pi' },
  { label: 'θ', latex: '\\theta' },
  { label: 'λ', latex: '\\lambda' },
  { label: 'α', latex: '\\alpha' },
  { label: 'β', latex: '\\beta' },
  { label: 'γ', latex: '\\gamma' },
  { label: 'δ', latex: '\\delta' },
  { label: 'ε', latex: '\\epsilon' },
  { label: 'ω', latex: '\\omega' },
  { label: 'ϕ', latex: '\\phi' },
  { label: 'ψ', latex: '\\psi' },
  { label: 'ζ', latex: '\\zeta' },
  { label: 'η', latex: '\\eta' },
  { label: 'μ', latex: '\\mu' },
  { label: 'ν', latex: '\\nu' },
  { label: 'ρ', latex: '\\rho' },
  { label: 'σ', latex: '\\sigma' },
  { label: 'τ', latex: '\\tau' },
];

const categories = [
  {
    name: 'Fraction',
    icon: <div className="flex flex-col items-center justify-center scale-75"><div className="w-4 h-0.5 bg-current" /><div className="w-4 h-0.5" /></div>,
    items: [
      { label: 'Vertical Fraction', latex: '\\frac{a}{b}', preview: 'a/b' },
      { label: 'Skewed Fraction', latex: '{a}/{b}', preview: 'a/b' },
      { label: 'Linear Fraction', latex: 'a/b', preview: 'a/b' },
    ]
  },
  {
    name: 'Script',
    icon: <div className="flex items-end gap-0.5 scale-75"><div className="w-3 h-3 border border-current" /><div className="w-2 h-2 border border-current mb-2" /></div>,
    items: [
      { label: 'Superscript', latex: 'x^{a}', preview: 'x^a' },
      { label: 'Subscript', latex: 'x_{a}', preview: 'x_a' },
      { label: 'Sub-Superscript', latex: 'x_{a}^{b}', preview: 'x_a^b' },
    ]
  },
  {
    name: 'Radical',
    icon: <div className="text-sm italic font-serif">√</div>,
    items: [
      { label: 'Square Root', latex: '\\sqrt{x}', preview: '√x' },
      { label: 'Cube Root', latex: '\\sqrt[3]{x}', preview: '³√x' },
      { label: 'Nth Root', latex: '\\sqrt[n]{x}', preview: 'ⁿ√x' },
    ]
  },
  {
    name: 'Integral',
    icon: <div className="text-sm italic font-serif">∫</div>,
    items: [
      { label: 'Integral', latex: '\\int', preview: '∫' },
      { label: 'Definite Integral', latex: '\\int_{a}^{b}', preview: '∫_a^b' },
      { label: 'Double Integral', latex: '\\iint', preview: '∬' },
      { label: 'Triple Integral', latex: '\\iiint', preview: '∭' },
    ]
  },
  {
    name: 'Large Op',
    icon: <Sigma className="w-4 h-4" />,
    items: [
      { label: 'Summation', latex: '\\sum', preview: '∑' },
      { label: 'Sum (with limits)', latex: '\\sum_{i=1}^{n}', preview: '∑' },
      { label: 'Product', latex: '\\prod', preview: '∏' },
      { label: 'Intersection', latex: '\\bigcap', preview: '∩' },
      { label: 'Union', latex: '\\bigcup', preview: '∪' },
    ]
  },
  {
    name: 'Bracket',
    icon: <Parentheses className="w-4 h-4" />,
    items: [
      { label: 'Parentheses', latex: '\\left( x \\right)', preview: '(x)' },
      { label: 'Square Brackets', latex: '\\left[ x \\right]', preview: '[x]' },
      { label: 'Curly Braces', latex: '\\left\\{ x \\right\\}', preview: '{x}' },
      { label: 'Angle Brackets', latex: '\\langle x \\rangle', preview: '<x>' },
      { label: 'Absolute Value', latex: '\\left| x \\right|', preview: '|x|' },
    ]
  },
  {
    name: 'Function',
    icon: <div className="text-[10px] font-bold">sin</div>,
    items: [
      { label: 'sine', latex: '\\sin(x)', preview: 'sin' },
      { label: 'cosine', latex: '\\cos(x)', preview: 'cos' },
      { label: 'tangent', latex: '\\tan(x)', preview: 'tan' },
      { label: 'secant', latex: '\\sec(x)', preview: 'sec' },
      { label: 'cosecant', latex: '\\csc(x)', preview: 'csc' },
      { label: 'cotangent', latex: '\\cot(x)', preview: 'cot' },
      { label: 'arcsine', latex: '\\arcsin(x)', preview: 'asin' },
      { label: 'arccosine', latex: '\\arccos(x)', preview: 'acos' },
      { label: 'arctangent', latex: '\\arctan(x)', preview: 'atan' },
    ]
  },
  {
    name: 'Accent',
    icon: <div className="flex flex-col items-center scale-75"><div className="w-2 h-0.5 bg-current mb-0.5 shadow-[0_4px_0_0_white]" /><div className="w-4 h-4 border border-current" /></div>,
    items: [
      { label: 'Bar', latex: '\\bar{x}', preview: 'x̄' },
      { label: 'Hat', latex: '\\hat{x}', preview: 'x̂' },
      { label: 'Dot', latex: '\\dot{x}', preview: 'ẋ' },
      { label: 'Double Dot', latex: '\\ddot{x}', preview: 'ẍ' },
      { label: 'Vector', latex: '\\vec{x}', preview: 'x⃗' },
      { label: 'Tilde', latex: '\\tilde{x}', preview: 'x̃' },
    ]
  },
  {
    name: 'Lim & Log',
    icon: <div className="text-[10px] font-bold">lim</div>,
    items: [
      { label: 'Limit', latex: '\\lim_{x \\to \\infty}', preview: 'lim' },
      { label: 'Logarithm', latex: '\\log(x)', preview: 'log' },
      { label: 'Natural Log', latex: '\\ln(x)', preview: 'ln' },
      { label: 'Log with Base', latex: '\\log_{b}(x)', preview: 'log_b' },
      { label: 'Log base 10', latex: '\\log_{10}(x)', preview: 'log₁₀' },
    ]
  },
  {
    name: 'Operator',
    icon: <div className="text-[14px] font-bold">→</div>,
    items: [
      { label: 'Arrow Right', latex: '\\to', preview: '→' },
      { label: 'Double Arrow', latex: '\\implies', preview: '⇒' },
      { label: 'If and only if', latex: '\\iff', preview: '⇔' },
      { label: 'Equivalent', latex: '\\equiv', preview: '≡' },
      { label: 'Proportional', latex: '\\propto', preview: '∝' },
      { label: 'Perpendicular', latex: '\\perp', preview: '⊥' },
      { label: 'Parallel', latex: '\\parallel', preview: '∥' },
    ]
  },
  {
    name: 'Matrix',
    icon: <div className="grid grid-cols-2 gap-0.5 border-x border-current px-0.5 scale-75"><div className="w-1 h-1 bg-current" /><div className="w-1 h-1 bg-current" /><div className="w-1 h-1 bg-current" /><div className="w-1 h-1 bg-current" /></div>,
    items: [
      { label: '2x2 Matrix', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '[2x2]' },
      { label: '3x3 Matrix', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', preview: '[3x3]' },
      { label: '2x1 Column', latex: '\\begin{pmatrix} a \\\\ b \\end{pmatrix}', preview: '[2x1]' },
      { label: '1x2 Row', latex: '\\begin{pmatrix} a & b \\end{pmatrix}', preview: '[1x2]' },
      { label: 'Determinant', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', preview: '|A|' },
    ]
  },
  {
    name: 'Formulas',
    icon: <div className="text-[10px] font-bold">f(x)</div>,
    items: [
      { label: 'Quadratic', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', preview: 'x=(-b±√D)/2a' },
      { label: 'Pythagorean', latex: 'a^2 + b^2 = c^2', preview: 'a²+b²=c²' },
      { label: 'Circle Area', latex: 'A = \\pi r^2', preview: 'A=πr²' },
      { label: 'Binomial', latex: '(a+b)^n = \\sum_{k=0}^n \\binom{n}{k} a^{n-k} b^k', preview: '(a+b)ⁿ' },
      { label: 'Euler', latex: 'e^{i\\pi} + 1 = 0', preview: 'eⁱπ+1=0' },
      { label: 'Deriv. Def.', latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}', preview: 'f\'(x)=lim...' },
    ]
  },
];

export function MathToolbar({ onInsert, language }: MathToolbarProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-1 mb-2 shadow-sm">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap gap-0.5 p-1 bg-white/50 rounded-lg border border-slate-100">
          {symbols.map((sym, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onInsert(`$${sym.latex}$`)}
              className="w-7 h-7 flex items-center justify-center hover:bg-white hover:shadow-sm rounded text-xs text-slate-700 transition-all font-serif border border-transparent hover:border-slate-200"
              title={sym.label}
            >
              {sym.label}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-1 p-1">
          {categories.map((cat) => (
            <div key={cat.name} className="relative">
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-1.5 rounded-lg border transition-all min-w-[50px] h-14",
                  activeCategory === cat.name 
                    ? "bg-white shadow-sm border-slate-200 text-indigo-600 scale-95" 
                    : "hover:bg-white/80 border-transparent text-slate-600 hover:border-slate-200"
                )}
                onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              >
                <div className={cn("transition-transform", activeCategory === cat.name ? "text-indigo-600" : "text-slate-500")}>
                  {cat.icon}
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap opacity-70">
                  {cat.name}
                </span>
              </button>

              {activeCategory === cat.name && (
                <>
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setActiveCategory(null)} />
                  <div className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] border border-slate-200 p-2 z-50 min-w-[200px] grid grid-cols-3 gap-1 animate-in fade-in slide-in-from-bottom-2">
                    <div className="col-span-3 px-2 py-1 mb-1 border-b border-slate-50 flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.name} Structures</span>
                       <button onClick={() => setActiveCategory(null)} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                    </div>
                    {cat.items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          onInsert(`$${item.latex}$`);
                          setActiveCategory(null);
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all text-center group"
                        title={item.label}
                      >
                        <div className="text-sm font-serif text-slate-800 group-hover:text-indigo-600 transition-colors">{item.preview}</div>
                        <span className="text-[8px] text-slate-400 font-medium leading-none truncate w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
