import { ExternalLink } from "./ExternalLink";

export function ExplainerText() {
  return (
    <div className="mt-2 mb-8 w-full text-left text-gray-600 sm:text-justify lg:max-w-[830px]">
      <p className="mb-0 leading-relaxed">
        This Dashboard is an annex to the{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/sites/default/files/2025-11/UN80_Initiative_Action_Plan.pdf">
          UN80 Initiative Action Plan
        </ExternalLink>
        . It presents the detailed work packages across the three{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/en">
          UN80 Initiative
        </ExternalLink>{" "}
        workstreams in a single reference. This Dashboard also lists designated
        leads for each work package, along with their individual action items
        (derived from paragraphs in the{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/en">
          SG&apos;s reports on the UN80 Initiative
        </ExternalLink>
        ).
      </p>
    </div>
  );
}
