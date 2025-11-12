export function ExplainerText() {
    return (
        <div className="text-gray-600 mt-2 mb-8 sm:text-justify w-full lg:max-w-[830px] text-left">
            <p className="leading-relaxed mb-0">
                This Dashboard is an annex to the{" "}
                <a
                    href="https://www.un.org/un80-initiative/sites/default/files/2025-11/UN80_Initiative_Action_Plan.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-un-blue hover:underline transition-all"
                >
                    UN80 Initiative Action Plan
                </a>
                . It presents the detailed work packages across the three{" "}
                <a
                    href="https://www.un.org/un80-initiative/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-un-blue hover:underline transition-all"
                >
                    UN80 Initiative
                </a>{" "}
                workstreams in a single reference. This Dashboard also lists designated leads
                for each work package, as well as their individual action items (derived from
                paragraphs in the SG&apos;s reports on the{" "}
                <a
                    href="https://www.un.org/un80-initiative/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-un-blue hover:underline transition-all"
                >
                    UN80 Initiative
                </a>
                ).
            </p>
        </div>
    );
}
