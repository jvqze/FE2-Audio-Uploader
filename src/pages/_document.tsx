import Document, { Head, Html, Main, NextScript } from 'next/document';

export default class ADocument extends Document {
    render() {
        return (
            <Html lang="en">
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover"
                />
                <Head>
                    <meta charSet="utf-8" />
                    <meta name="theme-color" content="#ffffff" />
                    <meta
                        name="description"
                        content="Flood Escape 2 Audio Uploader is for people that would love permanent uploads and also trimming. There's more to offer in FE2 Audio Uploader!"
                    />
                    <meta
                        property="og:image"
                        content="https://cdn.jaylen.nyc/r/fe2.jaylen.nyc-banner.png"
                    />

                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" />
                    <link
                        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap"
                        rel="stylesheet"
                    />
                </Head>
                <body>
                    <Main />
                    <NextScript />
                    <script async src="/theme.js" />
                </body>
            </Html>
        );
    }
}
