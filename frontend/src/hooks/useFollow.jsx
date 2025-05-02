import toast from "react-hot-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const useFollow = () => {
  const queryClient = useQueryClient();
  const { mutate: followMutate, isPending } = useMutation({
    mutationFn: async (userID) => {
      try {
        const res = await fetch(`/api/user/follow/${userID}`, {
          method: "POST",
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Something went wrong");

        return data;
      } catch (error) {
        throw new Error(error);
      }
    },
    onSuccess: () => {
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["suggestedUsers"] }),
        queryClient.invalidateQueries({ queryKey: ["authUser"] }),
      ]);
      toast.success("Followed Successfully");
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  return { followMutate, isPending };
};

export default useFollow;
