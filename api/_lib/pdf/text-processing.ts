// api/_lib/pdf/text-processing.ts

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Converts LaTeX to plain Unicode text for PDF generation.
 * Handles both delimited \(...\) and raw LaTeX commands.
 */
export function latexToUnicode(text: string): string {
  if (!text) return ''

  // Normalize double-escaped backslashes from JSON parsing
  let result = text.replace(/\\\\/g, '\\')

  // Process \(...\) and \[...\] blocks first
  result = result.replace(/\\\(([^]*?)\\\)|\\\[([^]*?)\\\]/g, (match, inline, display) => {
    const latex = (inline || display || '').trim()
    return convertLatexToUnicode(latex)
  })

  // Then process raw LaTeX commands (without delimiters)
  result = convertLatexToUnicode(result)

  return result
}

export function convertLatexToUnicode(latex: string): string {
  let result = latex

  // Vectors: \vec{a} → a⃗
  result = result.replace(/\\vec\{([^}]+)\}/g, '$1\u20D7')
  result = result.replace(/\\vec ([a-zA-Z])/g, '$1\u20D7')

  // Overline/bar: \bar{a} → ā or \overline{AB} → A̅B̅
  result = result.replace(/\\(?:bar|overline)\{([^}]+)\}/g, (_, content) => {
    return content.split('').map((c: string) => c + '\u0305').join('')
  })

  // Fractions: \frac{a}{b} → a/b (handle nested braces with loop)
  let prevResult = ''
  while (prevResult !== result) {
    prevResult = result
    result = result.replace(/\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '($1/$2)')
  }

  // Square root: \sqrt{x} → √x (handle nested braces with loop)
  prevResult = ''
  while (prevResult !== result) {
    prevResult = result
    result = result.replace(/\\sqrt\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, '√($1)')
  }
  result = result.replace(/\\sqrt ([a-zA-Z0-9])/g, '√$1')

  // Trig functions (standard)
  result = result.replace(/\\sin\s*/g, 'sin ')
  result = result.replace(/\\cos\s*/g, 'cos ')
  result = result.replace(/\\tan\s*/g, 'tan ')
  result = result.replace(/\\cot\s*/g, 'cot ')
  result = result.replace(/\\sec\s*/g, 'sec ')
  result = result.replace(/\\csc\s*/g, 'csc ')
  result = result.replace(/\\arcsin\s*/g, 'arcsin ')
  result = result.replace(/\\arccos\s*/g, 'arccos ')
  result = result.replace(/\\arctan\s*/g, 'arctan ')
  result = result.replace(/\\arccot\s*/g, 'arccot ')
  result = result.replace(/\\arcsec\s*/g, 'arcsec ')
  result = result.replace(/\\arccsc\s*/g, 'arccsc ')

  // Russian/European trig notation
  result = result.replace(/\\tg\s*/g, 'tg ')
  result = result.replace(/\\ctg\s*/g, 'ctg ')
  result = result.replace(/\\cosec\s*/g, 'cosec ')
  result = result.replace(/\\arctg\s*/g, 'arctg ')
  result = result.replace(/\\arcctg\s*/g, 'arcctg ')

  // Hyperbolic functions
  result = result.replace(/\\sinh\s*/g, 'sinh ')
  result = result.replace(/\\cosh\s*/g, 'cosh ')
  result = result.replace(/\\tanh\s*/g, 'tanh ')
  result = result.replace(/\\coth\s*/g, 'coth ')
  result = result.replace(/\\sech\s*/g, 'sech ')
  result = result.replace(/\\csch\s*/g, 'csch ')

  // Russian hyperbolic notation
  result = result.replace(/\\sh\s*/g, 'sh ')
  result = result.replace(/\\ch\s*/g, 'ch ')
  result = result.replace(/\\th\s*/g, 'th ')
  result = result.replace(/\\cth\s*/g, 'cth ')

  // Logarithms and other functions
  result = result.replace(/\\log\s*/g, 'log ')
  result = result.replace(/\\ln\s*/g, 'ln ')
  result = result.replace(/\\lg\s*/g, 'lg ')
  result = result.replace(/\\exp\s*/g, 'exp ')
  result = result.replace(/\\lim\s*/g, 'lim ')

  // Handle \operatorname{...}
  result = result.replace(/\\operatorname\{([^}]+)\}/g, '$1 ')

  // Degree: ^\circ → °
  result = result.replace(/\^\\circ/g, '°')

  // Superscripts (basic)
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ',
  }
  result = result.replace(/\^{([^}]+)}/g, (_, exp) => {
    return exp.split('').map((c: string) => superscripts[c] || `^${c}`).join('')
  })
  result = result.replace(/\^([0-9n])/g, (_, c) => superscripts[c] || `^${c}`)

  // Subscripts (basic)
  const subscripts: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'i': 'ᵢ', 'o': 'ₒ', 'u': 'ᵤ',
    'x': 'ₓ', 'n': 'ₙ', 'm': 'ₘ',
  }
  result = result.replace(/_\{([^}]+)\}/g, (_, sub) => {
    return sub.split('').map((c: string) => subscripts[c] || `_${c}`).join('')
  })
  result = result.replace(/_([0-9])/g, (_, c) => subscripts[c] || `_${c}`)

  // Greek letters
  const greekLetters: Record<string, string> = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
    '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
    '\\Psi': 'Ψ', '\\Omega': 'Ω',
  }
  for (const [tex, unicode] of Object.entries(greekLetters)) {
    result = result.replace(new RegExp(tex.replace(/\\/g, '\\\\'), 'g'), unicode)
  }

  // Math operators and symbols
  const symbols: Record<string, string> = {
    '\\cdot': '·', '\\times': '×', '\\div': '÷',
    '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠',
    '\\approx': '≈', '\\equiv': '≡',
    '\\infty': '∞', '\\partial': '∂',
    '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\leftrightarrow': '↔',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
    '\\angle': '∠', '\\perp': '⊥', '\\parallel': '∥',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
    '\\cup': '∪', '\\cap': '∩',
    '\\forall': '∀', '\\exists': '∃',
    '\\nabla': '∇', '\\triangle': '△',
    '\\circ': '°',
    '\\degree': '°',
    '\\,': ' ', '\\;': ' ', '\\quad': '  ', '\\qquad': '    ',
  }
  for (const [tex, unicode] of Object.entries(symbols)) {
    result = result.replace(new RegExp(tex.replace(/\\/g, '\\\\'), 'g'), unicode)
  }

  // Remove remaining LaTeX commands like \text{}, \mathrm{}, etc.
  result = result.replace(/\\(?:text|mathrm|mathbf|mathit|mathsf)\{([^}]+)\}/g, '$1')

  // Remove curly braces used for grouping
  result = result.replace(/\{([^{}]+)\}/g, '$1')

  // Clean up any remaining backslashes before common letters
  result = result.replace(/\\([a-zA-Z]+)/g, '$1')

  return result.trim()
}

/**
 * Process text: convert LaTeX to Unicode, then escape HTML
 */
export function processText(text: string): string {
  return escapeHtml(latexToUnicode(text))
}
