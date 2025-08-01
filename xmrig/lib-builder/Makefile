all: toolchain libuv hwloc openssl xmrig xmrig-mo install

toolchain:
	@read -p "Compilare toolchain? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/toolchain-build.sh; \
	else \
		echo "Saltato toolchain."; \
	fi

libuv_dl:
	@read -p "Scaricare libuv? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/libuv-fetch.sh; \
	else \
		echo "Saltato libuv_dl."; \
	fi

libuv: toolchain libuv_dl
	@read -p "Compilare libuv? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/libuv-build.sh; \
	else \
		echo "Saltato libuv."; \
	fi

openssl_dl:
	@read -p "Scaricare openssl? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/openssl-fetch.sh; \
	else \
		echo "Saltato openssl_dl."; \
	fi

openssl: toolchain openssl_dl
	@read -p "Compilare openssl? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/openssl-build.sh; \
	else \
		echo "Saltato openssl."; \
	fi

xmrig_dl:
	@read -p "Scaricare xmrig? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/xmrig-fetch.sh; \
	else \
		echo "Saltato xmrig_dl."; \
	fi

xmrig: toolchain xmrig_dl
	@read -p "Compilare xmrig? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/xmrig-build.sh; \
	else \
		echo "Saltato xmrig."; \
	fi

xmrig-mo_dl:
	@read -p "Scaricare xmrig-mo? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/xmrig-mo-fetch.sh; \
	else \
		echo "Saltato xmrig-mo_dl."; \
	fi

xmrig-mo: toolchain xmrig-mo_dl
	@read -p "Compilare xmrig-mo? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/xmrig-mo-build.sh; \
	else \
		echo "Saltato xmrig-mo."; \
	fi

hwloc_dl:
	@read -p "Scaricare hwloc? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/hwloc-fetch.sh; \
	else \
		echo "Saltato hwloc_dl."; \
	fi

hwloc: toolchain hwloc_dl
	@read -p "Compilare hwloc? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/hwloc-build.sh; \
	else \
		echo "Saltato hwloc."; \
	fi

install:
	@read -p "Eseguire install? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/install.sh; \
	else \
		echo "Saltato install."; \
	fi

clean:
	@read -p "Eseguire clean? (s/n) " ans; \
	if [ "$$ans" = "s" ]; then \
		script/clean.sh; \
	else \
		echo "Saltato clean."; \
	fi