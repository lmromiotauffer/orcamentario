import { useLastUpdateDate } from "@cluster-data-experience/qlik-modules";

export const useUpdateDate = () => {
  const { lastUpdateDate, isLoading } = useLastUpdateDate();
  const formattedDateString = lastUpdateDate?.parsedDate?.toLocaleString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const lastUpdateDateFormatted = {
    title: `Atualizado: ${formattedDateString || "..."}`,
    isLoading: isLoading,
    hasError: false,
  };

  return { lastUpdatedDate: lastUpdateDateFormatted, isLoading };
};
