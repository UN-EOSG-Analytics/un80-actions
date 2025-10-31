
export default function Home() {
    return (
        <main className="min-h-screen bg-background flex justify-center px-4 sm:px-6">
            <div className="max-w-2xl lg:max-w-3xl py-8">
                {/* Logo */}
                <img
                    src="/images/UN Logo_Horizontal_English/Colour/UN Logo_Horizontal_Colour_English.svg"
                    alt="UN Logo"
                    className="h-10 sm:h-12 w-auto select-none mb-12"
                    draggable="false"
                />

                {/* Header */}
                <header className="mb-5">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground">
                        UN Website Boilerplate
                    </h1>
                </header>

                {/* Content */}
                <section className="mb-8">
                    <p className="text-muted-foreground leading-relaxed mb-6">
                        A modern, responsive foundation for United Nations web applications.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <a
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-6 py-3 bg-foreground text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            View Dashboard
                        </a>
                    </div>
                </section>
            </div>
        </main>
    );
}
