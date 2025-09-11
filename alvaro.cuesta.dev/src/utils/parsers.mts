export type Parser<T> = (input: string) => [T, string];

export type Extractor<T> = (input: string) => T;

export class ParseError extends Error {}

// Basic parsers
export function pStr(s: string): Parser<string> {
  return (input) => {
    if (input.startsWith(s)) {
      return [s, input.slice(s.length)];
    }
    throw new ParseError(`Expected "${s}"`);
  };
}

export function pRegex(re: RegExp): Parser<string> {
  return (input) => {
    const m = input.match(re);
    if (m && m.index === 0) {
      return [m[0], input.slice(m[0].length)];
    }
    throw new ParseError(`Expected pattern ${re}`);
  };
}

export function pWs(): Parser<string> {
  return pRegex(/^[ \t]+/);
}

// Parser combinators
export function cMap<In, Out>(
  parser: Parser<In>,
  fn: (a: In) => Out,
): Parser<Out> {
  return (input) => {
    const [a, rest] = parser(input);
    return [fn(a), rest];
  };
}

export function cOpt<T>(parser: Parser<T>): Parser<T | undefined> {
  return (input) => {
    try {
      return parser(input);
    } catch (e) {
      if (!(e instanceof ParseError)) {
        throw e;
      }
      return [undefined, input];
    }
  };
}

export function cOr<T>(...parsers: Parser<T>[]): Parser<T> {
  return (input) => {
    for (const parser of parsers) {
      try {
        return parser(input);
      } catch (e) {
        if (!(e instanceof ParseError)) {
          throw e;
        }
      }
    }
    throw new ParseError(
      "Expected one of: " + parsers.map((p) => p.toString()).join(", "),
    );
  };
}

export function cSeq2<A, B>(a: Parser<A>, b: Parser<B>): Parser<[A, B]> {
  return (input) => {
    const [av, rest1] = a(input);
    const [bv, rest2] = b(rest1);
    return [[av, bv], rest2];
  };
}

export function cSeq3<A, B, C>(
  a: Parser<A>,
  b: Parser<B>,
  c: Parser<C>,
): Parser<[A, B, C]> {
  return (input) => {
    const [av, rest1] = a(input);
    const [bv, rest2] = b(rest1);
    const [cv, rest3] = c(rest2);
    return [[av, bv, cv], rest3];
  };
}

export function cSep<A, Sep, C>(
  a: Parser<A>,
  sep: Parser<Sep>,
  b: Parser<C>,
): Parser<[A, C]> {
  return cMap(cSeq3(a, sep, b), ([av, , bv]) => [av, bv]);
}

export function cBetween<T, Between>(
  parser: Parser<T>,
  wrapper: Parser<Between>,
): Parser<T> {
  return cMap(cSeq3(wrapper, parser, wrapper), ([_, inner, __]) => inner);
}

export function cMany<T>(parser: Parser<T>): Parser<T[]> {
  return (input) => {
    const result: T[] = [];
    let rest = input;
    while (true) {
      try {
        const [v, r] = parser(rest);
        result.push(v);
        rest = r;
      } catch {
        break;
      }
    }
    return [result, rest];
  };
}

// Extractors
export function oComplete<T>(parser: Parser<T>): Extractor<T> {
  return (input) => {
    const [result, rest] = parser(input);

    if (rest.length > 0) {
      throw new ParseError("Expected end of input");
    }
    return result;
  };
}
