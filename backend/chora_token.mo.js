import Nat "mo:base/Nat";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";

actor Token {

  // ---------- Token Metadata ----------
  let name : Text = "Chora";
  let symbol : Text = "CHRA";
  let decimals : Nat8 = 8;

  stable var totalSupply_ : Nat = 1_000_000_000; // 1B initial
  stable var minter_ : Principal = Principal.fromText("aaaaa-aa"); // nanti di-set deployer

  // ---------- Storage ----------
  stable var balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);
  stable var allowances = HashMap.HashMap<(Principal, Principal), Nat>(10, func (x, y) { x == y }, func (k) { Nat.hash(k.0) + Nat.hash(k.1) });

  // ---------- Internal Helper ----------
  func _require(cond: Bool, msg: Text) {
    if (!cond) { assert false with msg }
  };

  func _transfer(from: Principal, to: Principal, value: Nat) {
    _require(value > 0, "amount=0");
    let fromBal = switch (balances.get(from)) { case (?b) b; case null 0 };
    _require(fromBal >= value, "insufficient balance");
    balances.put(from, fromBal - value);
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + value);
  };

  // ---------- Core ----------
  public shared(msg) func balanceOf(owner: Principal): async Nat {
    switch (balances.get(owner)) { case (?b) b; case null 0 }
  };

  public shared(msg) func totalSupply(): async Nat { totalSupply_ };

  public shared(msg) func allowance(owner: Principal, spender: Principal): async Nat {
    switch (allowances.get((owner, spender))) { case (?a) a; case null 0 }
  };

  public shared(msg) func transfer(to: Principal, value: Nat): async Bool {
    _transfer(msg.caller, to, value);
    true
  };

  public shared(msg) func approve(spender: Principal, value: Nat): async Bool {
    allowances.put((msg.caller, spender), value);
    true
  };

  public shared(msg) func transferFrom(from: Principal, to: Principal, value: Nat): async Bool {
    let key = (from, msg.caller);
    let allowed = switch (allowances.get(key)) { case (?a) a; case null 0 };
    _require(allowed >= value, "allowance too low");
    _transfer(from, to, value);
    allowances.put(key, allowed - value);
    true
  };

  // ---------- Minter Control ----------
  public shared(msg) func setMinter(newMinter: Principal): async () {
    _require(msg.caller == minter_, "only current minter");
    minter_ := newMinter;
  };

  public shared(msg) func mint(to: Principal, amount: Nat): async Bool {
    _require(msg.caller == minter_, "only minter can mint");
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);
    totalSupply_ += amount;
    true
  };

  public shared(msg) func burn(from: Principal, amount: Nat): async Bool {
    _require(msg.caller == minter_, "only minter can burn");
    let bal = switch (balances.get(from)) { case (?b) b; case null 0 };
    _require(bal >= amount, "balance too low");
    balances.put(from, bal - amount);
    totalSupply_ -= amount;
    true
  };

  // ---------- Reward Distribution ----------
  // Khusus untuk task DApp. Misalnya hanya admin/task-canister yg boleh panggil.
  stable var rewardAdmin : Principal = minter_; // default sama dengan minter

  public shared(msg) func setRewardAdmin(newAdmin: Principal): async () {
    _require(msg.caller == rewardAdmin, "only current rewardAdmin can change");
    rewardAdmin := newAdmin;
  };

  public shared(msg) func giveReward(to: Principal, amount: Nat): async Bool {
    _require(msg.caller == rewardAdmin, "only rewardAdmin can give rewards");
    let toBal = switch (balances.get(to)) { case (?b) b; case null 0 };
    balances.put(to, toBal + amount);
    // supply tidak nambah karena rewardAdmin dapat token dari allocation awal
    true
  };
};