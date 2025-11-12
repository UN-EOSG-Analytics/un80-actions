export function ExplainerText() {
    return (
        <div className="text-muted-foreground mt-4 sm:text-justify w-full lg:max-w-[818px] text-left">
            <p className="leading-tight mb-0">
                This Dashboard is an annex to the{" "}
                <a
                    href="https://www.un.org/un80-initiative/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:text-shuttle-gray transition-colors"
                >
                    UN80 Initiative Action Plan
                </a>
                . It presents the detailed work packages across the three{" "}
                <a
                    href="https://www.un.org/un80-initiative/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:text-shuttle-gray transition-colors"
                >
                    UN80 Initiative
                </a>{" "}
                workstreams in a single reference. This Dashboard also lists designated leads
                for each work package, as well as their individual action items (derived from
                paragraphs in the SG&apos;s reports on{" "}
                <a
                    href="https://www.un.org/un80-initiative/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-un-blue hover:text-shuttle-gray transition-colors"
                >
                    UN80 Initiative
                </a>
                ).
            </p>
        </div>
    );
}
