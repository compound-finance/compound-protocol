
export interface Artifact {}
export interface Artifacts {
  require(file: string): Artifact
}
