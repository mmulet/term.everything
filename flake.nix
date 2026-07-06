{
  description = "Run any GUI app in the terminal";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs =
    {
      self,
      nixpkgs,
      ...
    }:
    let
      allSystems = [
        "x86_64-linux"
        "aarch64-linux"
        # "x86_64-darwin"
        # "aarch64-darwin"
      ];
      forAllSystems =
        f:
        nixpkgs.lib.genAttrs allSystems (
          system:
          f {
            pkgs = import nixpkgs { inherit system; };
          }
        );
    in
    {
      packages = forAllSystems (
        { pkgs }:
        {
          default = pkgs.buildGoModule rec {
            pname = "term-everything";
            name = pname;
            version = "0.7.8";
            subPackages = [ "." ];
            src = ./.;
            vendorHash = null;
            nativeBuildInputs = with pkgs; [
              pkg-config
            ];
            buildInputs = with pkgs; [
              glib
              chafa
            ];
            preBuild = ''
              go generate ./wayland
            '';
            postInstall = ''
              # rm $out/bin/generate
              mv $out/bin/term.everything $out/bin/${name}
            '';
          };
        }
      );
    };
}
