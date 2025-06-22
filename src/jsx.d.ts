/* ******************************** */
/* JSX Namespace Type Declarations  */
/* ******************************** */

import type { AnyMiniReactElement, EventHandlers } from "./types";

declare global {
    namespace JSX {
        // Base element type that all JSX elements must conform to
        type Element = AnyMiniReactElement;

        // Interface for element class - not used in functional approach but required by TS
        interface ElementClass {
            render(): AnyMiniReactElement | null;
        }

        // Attributes interface - what props are allowed on JSX elements
        interface ElementAttributesProperty {
            props: Record<string, unknown>;
        }

        // Children property name
        interface ElementChildrenAttribute {
            children: AnyMiniReactElement | AnyMiniReactElement[] | string | number | null | undefined;
        }

        // Intrinsic elements - HTML element types and their attributes
        interface IntrinsicElements {
            // HTML elements with their specific attributes
            a: IntrinsicHTMLAttributes & { href?: string; target?: string; rel?: string };
            abbr: IntrinsicHTMLAttributes;
            address: IntrinsicHTMLAttributes;
            area: IntrinsicHTMLAttributes & { alt?: string; coords?: string; href?: string; shape?: string };
            article: IntrinsicHTMLAttributes;
            aside: IntrinsicHTMLAttributes;
            audio: IntrinsicHTMLAttributes & { controls?: boolean; loop?: boolean; muted?: boolean; preload?: string; src?: string };
            b: IntrinsicHTMLAttributes;
            base: IntrinsicHTMLAttributes & { href?: string; target?: string };
            bdi: IntrinsicHTMLAttributes;
            bdo: IntrinsicHTMLAttributes;
            blockquote: IntrinsicHTMLAttributes & { cite?: string };
            body: IntrinsicHTMLAttributes;
            br: IntrinsicHTMLAttributes;
            button: IntrinsicHTMLAttributes & { disabled?: boolean; form?: string; formaction?: string; formenctype?: string; formmethod?: string; formnovalidate?: boolean; formtarget?: string; name?: string; type?: 'submit' | 'reset' | 'button'; value?: string };
            canvas: IntrinsicHTMLAttributes & { height?: number | string; width?: number | string };
            caption: IntrinsicHTMLAttributes;
            cite: IntrinsicHTMLAttributes;
            code: IntrinsicHTMLAttributes;
            col: IntrinsicHTMLAttributes & { span?: number };
            colgroup: IntrinsicHTMLAttributes & { span?: number };
            data: IntrinsicHTMLAttributes & { value?: string };
            datalist: IntrinsicHTMLAttributes;
            dd: IntrinsicHTMLAttributes;
            del: IntrinsicHTMLAttributes & { cite?: string; datetime?: string };
            details: IntrinsicHTMLAttributes & { open?: boolean };
            dfn: IntrinsicHTMLAttributes;
            dialog: IntrinsicHTMLAttributes & { open?: boolean };
            div: IntrinsicHTMLAttributes;
            dl: IntrinsicHTMLAttributes;
            dt: IntrinsicHTMLAttributes;
            em: IntrinsicHTMLAttributes;
            embed: IntrinsicHTMLAttributes & { height?: number | string; src?: string; type?: string; width?: number | string };
            fieldset: IntrinsicHTMLAttributes & { disabled?: boolean; form?: string; name?: string };
            figcaption: IntrinsicHTMLAttributes;
            figure: IntrinsicHTMLAttributes;
            footer: IntrinsicHTMLAttributes;
            form: IntrinsicHTMLAttributes & { acceptCharset?: string; action?: string; autocomplete?: string; enctype?: string; method?: string; name?: string; novalidate?: boolean; target?: string };
            h1: IntrinsicHTMLAttributes;
            h2: IntrinsicHTMLAttributes;
            h3: IntrinsicHTMLAttributes;
            h4: IntrinsicHTMLAttributes;
            h5: IntrinsicHTMLAttributes;
            h6: IntrinsicHTMLAttributes;
            head: IntrinsicHTMLAttributes;
            header: IntrinsicHTMLAttributes;
            hgroup: IntrinsicHTMLAttributes;
            hr: IntrinsicHTMLAttributes;
            html: IntrinsicHTMLAttributes & { lang?: string; dir?: 'ltr' | 'rtl' | 'auto' };
            i: IntrinsicHTMLAttributes;
            iframe: IntrinsicHTMLAttributes & { allow?: string; allowfullscreen?: boolean; frameborder?: number | string; height?: number | string; loading?: 'eager' | 'lazy'; name?: string; referrerpolicy?: string; sandbox?: string; src?: string; srcdoc?: string; width?: number | string };
            img: IntrinsicHTMLAttributes & { alt?: string; crossorigin?: 'anonymous' | 'use-credentials' | '' | undefined; decoding?: 'sync' | 'async' | 'auto'; height?: number | string; loading?: 'eager' | 'lazy'; referrerpolicy?: string; sizes?: string; src?: string; srcset?: string; usemap?: string; width?: number | string };
            input: IntrinsicHTMLAttributes & InputHTMLAttributes;
            ins: IntrinsicHTMLAttributes & { cite?: string; datetime?: string };
            kbd: IntrinsicHTMLAttributes;
            label: IntrinsicHTMLAttributes & { form?: string; htmlFor?: string };
            legend: IntrinsicHTMLAttributes;
            li: IntrinsicHTMLAttributes & { value?: number };
            link: IntrinsicHTMLAttributes & { as?: string; crossorigin?: string; href?: string; hreflang?: string; integrity?: string; media?: string; referrerpolicy?: string; rel?: string; sizes?: string; type?: string };
            main: IntrinsicHTMLAttributes;
            map: IntrinsicHTMLAttributes & { name?: string };
            mark: IntrinsicHTMLAttributes;
            menu: IntrinsicHTMLAttributes;
            meta: IntrinsicHTMLAttributes & { charset?: string; content?: string; httpEquiv?: string; name?: string };
            meter: IntrinsicHTMLAttributes & { form?: string; high?: number; low?: number; max?: number; min?: number; optimum?: number; value?: number };
            nav: IntrinsicHTMLAttributes;
            noscript: IntrinsicHTMLAttributes;
            object: IntrinsicHTMLAttributes & { data?: string; form?: string; height?: number | string; name?: string; type?: string; usemap?: string; width?: number | string };
            ol: IntrinsicHTMLAttributes & { reversed?: boolean; start?: number; type?: '1' | 'a' | 'A' | 'i' | 'I' };
            optgroup: IntrinsicHTMLAttributes & { disabled?: boolean; label?: string };
            option: IntrinsicHTMLAttributes & { disabled?: boolean; label?: string; selected?: boolean; value?: string | string[] | number };
            output: IntrinsicHTMLAttributes & { form?: string; htmlFor?: string; name?: string };
            p: IntrinsicHTMLAttributes;
            picture: IntrinsicHTMLAttributes;
            pre: IntrinsicHTMLAttributes;
            progress: IntrinsicHTMLAttributes & { max?: number; value?: number };
            q: IntrinsicHTMLAttributes & { cite?: string };
            rp: IntrinsicHTMLAttributes;
            rt: IntrinsicHTMLAttributes;
            ruby: IntrinsicHTMLAttributes;
            s: IntrinsicHTMLAttributes;
            samp: IntrinsicHTMLAttributes;
            script: IntrinsicHTMLAttributes & { async?: boolean; crossorigin?: string; defer?: boolean; integrity?: string; nomodule?: boolean; referrerpolicy?: string; src?: string; type?: string };
            section: IntrinsicHTMLAttributes;
            select: IntrinsicHTMLAttributes & SelectHTMLAttributes;
            small: IntrinsicHTMLAttributes;
            source: IntrinsicHTMLAttributes & { media?: string; sizes?: string; src?: string; srcset?: string; type?: string };
            span: IntrinsicHTMLAttributes;
            strong: IntrinsicHTMLAttributes;
            style: IntrinsicHTMLAttributes & { media?: string; nonce?: string; title?: string; type?: string };
            sub: IntrinsicHTMLAttributes;
            summary: IntrinsicHTMLAttributes;
            sup: IntrinsicHTMLAttributes;
            table: IntrinsicHTMLAttributes;
            tbody: IntrinsicHTMLAttributes;
            td: IntrinsicHTMLAttributes & { colspan?: number; headers?: string; rowspan?: number };
            template: IntrinsicHTMLAttributes;
            textarea: IntrinsicHTMLAttributes & TextareaHTMLAttributes;
            tfoot: IntrinsicHTMLAttributes;
            th: IntrinsicHTMLAttributes & ThHTMLAttributes;
            thead: IntrinsicHTMLAttributes;
            time: IntrinsicHTMLAttributes & { datetime?: string };
            title: IntrinsicHTMLAttributes;
            tr: IntrinsicHTMLAttributes;
            track: IntrinsicHTMLAttributes & { default?: boolean; kind?: string; label?: string; src?: string; srclang?: string };
            u: IntrinsicHTMLAttributes;
            ul: IntrinsicHTMLAttributes;
            var: IntrinsicHTMLAttributes;
            video: IntrinsicHTMLAttributes & { autoplay?: boolean; controls?: boolean; crossorigin?: string; height?: number | string; loop?: boolean; muted?: boolean; playsinline?: boolean; poster?: string; preload?: string; src?: string; width?: number | string };
            wbr: IntrinsicHTMLAttributes;
        }

        // Base interface for all HTML element attributes
        interface IntrinsicHTMLAttributes extends EventHandlers {
            // Global HTML attributes
            id?: string;
            className?: string;
            class?: string; // Alternative to className for compatibility
            style?: string | Record<string, string | number>;
            title?: string;
            lang?: string;
            dir?: 'ltr' | 'rtl' | 'auto';
            hidden?: boolean;
            tabIndex?: number;
            role?: string;

            // ARIA attributes
            'aria-label'?: string;
            'aria-labelledby'?: string;
            'aria-describedby'?: string;
            'aria-hidden'?: boolean | 'true' | 'false';
            'aria-expanded'?: boolean | 'true' | 'false';
            'aria-selected'?: boolean | 'true' | 'false';
            'aria-checked'?: boolean | 'true' | 'false' | 'mixed';
            'aria-disabled'?: boolean | 'true' | 'false';
            'aria-readonly'?: boolean | 'true' | 'false';
            'aria-required'?: boolean | 'true' | 'false';
            'aria-invalid'?: 'true' | 'false' | 'grammar' | 'spelling';
            'aria-live'?: 'off' | 'assertive' | 'polite';
            'aria-atomic'?: boolean | 'true' | 'false';
            'aria-busy'?: boolean | 'true' | 'false';
            'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';

            // Data attributes
            [key: `data-${string}`]: string | number | boolean | undefined;

            // React-specific attributes
            key?: string | number;
            ref?: unknown; // For future ref support

            // Children
            children?:
            | AnyMiniReactElement
            | AnyMiniReactElement[]
            | string
            | number
            | null
            | undefined;
        }

        // Specific HTML element attribute interfaces
        interface InputHTMLAttributes {
            accept?: string;
            alt?: string;
            autocomplete?: string;
            autofocus?: boolean;
            capture?: boolean | 'user' | 'environment';
            checked?: boolean;
            crossorigin?: string;
            disabled?: boolean;
            form?: string;
            formaction?: string;
            formenctype?: string;
            formmethod?: string;
            formnovalidate?: boolean;
            formtarget?: string;
            height?: number | string;
            list?: string;
            max?: number | string;
            maxlength?: number;
            min?: number | string;
            minlength?: number;
            multiple?: boolean;
            name?: string;
            pattern?: string;
            placeholder?: string;
            readonly?: boolean;
            required?: boolean;
            size?: number;
            src?: string;
            step?: number | string;
            type?: 'button' | 'checkbox' | 'color' | 'date' | 'datetime-local' | 'email' | 'file' | 'hidden' | 'image' | 'month' | 'number' | 'password' | 'radio' | 'range' | 'reset' | 'search' | 'submit' | 'tel' | 'text' | 'time' | 'url' | 'week';
            value?: string | string[] | number;
            width?: number | string;
        }

        interface SelectHTMLAttributes {
            autofocus?: boolean;
            disabled?: boolean;
            form?: string;
            multiple?: boolean;
            name?: string;
            required?: boolean;
            size?: number;
            value?: string | string[] | number;
        }

        interface TextareaHTMLAttributes {
            autofocus?: boolean;
            cols?: number;
            dirname?: string;
            disabled?: boolean;
            form?: string;
            maxlength?: number;
            minlength?: number;
            name?: string;
            placeholder?: string;
            readonly?: boolean;
            required?: boolean;
            rows?: number;
            value?: string | number;
            wrap?: string;
        }

        interface ThHTMLAttributes {
            abbr?: string;
            colspan?: number;
            headers?: string;
            rowspan?: number;
            scope?: string;
        }
    }
} 