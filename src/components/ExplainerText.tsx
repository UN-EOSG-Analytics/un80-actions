import { ExternalLink } from "./ExternalLink";

export function ExplainerText() {
  return (
    <div className="-mt-2 mb-6 w-full text-left text-sm text-gray-600 sm:text-justify sm:text-base">
      <p className="mb-0 leading-relaxed">
        This Dashboard complements the{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/sites/default/files/2025-11/UN80_Initiative_Action_Plan.pdf">
          UN80 Initiative Action Plan
        </ExternalLink>
        . It provides a consolidated reference of the work packages across the
        three{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/en">
          UN80 Initiative
        </ExternalLink>{" "}
        workstreams. The Dashboard shows the designated leads for each work
        package, along with the corresponding indicative actions, as drawn from
        the{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/en">
          Secretary-General&apos;s reports on the UN80 Initiative
        </ExternalLink>{" "}
        [and the Action Plan and its annex].
      </p>
      <p className="mt-4 mb-0 leading-relaxed">
        Milestone and timeline information will be updated on an ongoing basis.
        This enables the sharing of key developments as the{" "}
        <ExternalLink href="https://www.un.org/un80-initiative/en">
          UN80 Initiative
        </ExternalLink>{" "}
        progresses.
      </p>
    </div>
  );
}
