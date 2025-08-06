import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("Organization Management Tests", () => {
  it("can create a new organization", () => {
    // Create organization
    const { result, events } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    
    // Verify creation was successful
    expect(result).toBeOk();
    expect(result).toBeUint(1);
    
    // Check that next org ID was incremented
    const { result: nextId } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "get-next-organization-id",
      [],
      wallet1
    );
    expect(nextId).toBeUint(2);
  });

  it("can add members to organization", () => {
    // Create organization first
    const { result: createResult } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    expect(createResult).toBeOk();
    expect(createResult).toBeUint(1);
    
    // Add member to organization
    const { result: addResult } = simnet.callPublicFn(
      "workshield-escrow",
      "add-organization-member",
      [Cl.uint(1), Cl.principal(wallet2), Cl.stringAscii("admin")],
      wallet1
    );
    
    expect(addResult).toBeOk();
    expect(addResult).toBeBool(true);
    
    // Verify member was added
    const { result: memberData } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "get-organization-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1
    );
    
    expect(memberData).toBeSome();
    const memberTuple = memberData.expectSome();
    expect(Cl.unwrapString(memberTuple.role)).toBe("admin");
    expect(Cl.unwrapPrincipal(memberTuple["added-by"])).toBe(wallet1);
  });

  it("enforces organization owner permissions", () => {
    // Create organization
    const { result: createResult } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    expect(createResult).toBeOk();
    
    // Try to add member as non-owner (should fail)
    const { result: failResult } = simnet.callPublicFn(
      "workshield-escrow",
      "add-organization-member",
      [Cl.uint(1), Cl.principal(wallet3), Cl.stringAscii("member")],
      wallet2 // wallet2 is not the owner
    );
    
    expect(failResult).toBeErr();
    expect(failResult).toBeUint(101); // err-not-authorized
    
    // Add member as owner (should succeed)
    const { result: successResult } = simnet.callPublicFn(
      "workshield-escrow",
      "add-organization-member",
      [Cl.uint(1), Cl.principal(wallet3), Cl.stringAscii("member")],
      wallet1 // wallet1 is the owner
    );
    
    expect(successResult).toBeOk();
    expect(successResult).toBeBool(true);
  });

  it("can check organization membership", () => {
    // Create organization
    const { result: createResult } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    expect(createResult).toBeOk();
    
    // Check that creator is automatically a member
    const { result: isMember } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "is-organization-member-read",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet1
    );
    expect(isMember).toBeBool(true);
    
    // Check that creator is the owner
    const { result: isOwner } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "is-organization-owner-read",
      [Cl.uint(1), Cl.principal(wallet1)],
      wallet1
    );
    expect(isOwner).toBeBool(true);
    
    // Check that non-member returns false
    const { result: isNotMember } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "is-organization-member-read",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1
    );
    expect(isNotMember).toBeBool(false);
  });

  it("can update organization details", () => {
    // Create organization
    const { result: createResult } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    expect(createResult).toBeOk();
    
    // Update organization as owner
    const { result: updateResult } = simnet.callPublicFn(
      "workshield-escrow",
      "update-organization",
      [Cl.uint(1), Cl.stringAscii("TechCorp LLC"), Cl.stringUtf8("Updated description")],
      wallet1
    );
    
    expect(updateResult).toBeOk();
    expect(updateResult).toBeBool(true);
    
    // Verify organization was updated
    const { result: orgData } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "get-organization",
      [Cl.uint(1)],
      wallet1
    );
    
    expect(orgData).toBeSome();
    const orgTuple = orgData.expectSome();
    expect(Cl.unwrapString(orgTuple.name)).toBe("TechCorp LLC");
    expect(Cl.unwrapString(orgTuple.description)).toBe("Updated description");
  });

  it("can remove organization members", () => {
    // Create organization
    const { result: createResult } = simnet.callPublicFn(
      "workshield-escrow",
      "create-organization", 
      [Cl.stringAscii("TechCorp Inc"), Cl.stringUtf8("A technology consulting company")],
      wallet1
    );
    expect(createResult).toBeOk();
    
    // Add member
    const { result: addResult } = simnet.callPublicFn(
      "workshield-escrow",
      "add-organization-member",
      [Cl.uint(1), Cl.principal(wallet2), Cl.stringAscii("member")],
      wallet1
    );
    expect(addResult).toBeOk();
    
    // Remove member
    const { result: removeResult } = simnet.callPublicFn(
      "workshield-escrow",
      "remove-organization-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1
    );
    
    expect(removeResult).toBeOk();
    expect(removeResult).toBeBool(true);
    
    // Verify member was removed
    const { result: memberData } = simnet.callReadOnlyFn(
      "workshield-escrow",
      "get-organization-member",
      [Cl.uint(1), Cl.principal(wallet2)],
      wallet1
    );
    
    expect(memberData).toBeNone();
  });
});