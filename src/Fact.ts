export default interface Fact<TFactType extends string, TData = never, TMetadata = never> {
  streamId: number;
  sequence: number;
  type: TFactType;
  time: Date;
  data: TData;
  metadata: TMetadata;
}
